import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../components/ui/ToastContext';
import { testFirestoreConnection } from '../../lib/firebase';
import { AudioService } from '../../services/audio.service';
import { Product } from '../../models/product.model';
import { findBestProductMatch, findProductByExactCode } from '../../lib/product-matcher';

import { useInventoryController } from '../../controllers/useInventoryController';
import { useSettingsController } from '../../controllers/useSettingsController';
import { useSessionController } from '../../controllers/useSessionController';
import { usePOSController } from '../../controllers/usePOSController';
import { useReportsController } from '../../controllers/useReportsController';

interface AppContextValue {
  inventoryCtrl: ReturnType<typeof useInventoryController>;
  settingsCtrl: ReturnType<typeof useSettingsController>;
  sessionCtrl: ReturnType<typeof useSessionController>;
  reportsCtrl: ReturnType<typeof useReportsController>;
  posCtrl: ReturnType<typeof usePOSController>;
  globalSearchTerm: string;
  setGlobalSearchTerm: (term: string) => void;
  barcodeForNewProduct: string;
  setBarcodeForNewProduct: (code: string) => void;
  productToEdit: Product | null;
  setProductToEdit: (prod: Product | null) => void;
  currenciesList: Array<{
    code: string;
    symbol: string;
    name: string;
    rateToBase: number;
    isBase: boolean;
    decimalPlaces: number;
  }>;
  handleHeaderBarcodeScanned: (barcode: string) => void;
  handleSelectProductFromHeader: (product: Product) => void;
  handleStartEditProduct: (product: Product) => void;
  handleCancelSale: (saleId: string) => void;
  handleDataRestored: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { success, error: toastError, info } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [barcodeForNewProduct, setBarcodeForNewProduct] = useState('');
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Controllers
  const settingsCtrl = useSettingsController();
  const sessionCtrl = useSessionController(settingsCtrl.settings);
  const inventoryCtrl = useInventoryController();
  const reportsCtrl = useReportsController(settingsCtrl.settings);

  const posCtrl = usePOSController({
    products: inventoryCtrl.products,
    onStockDeducted: (updatedProducts) => {
      inventoryCtrl.syncProducts(updatedProducts);
      reportsCtrl.loadSales();
    },
    exchangeRateUsdToBs: settingsCtrl.settings.exchangeRateUsdToBs,
    activeSessionId: sessionCtrl.activeSession?.id,
  });

  const getActiveModule = () => {
    const path = location.pathname;
    if (path.startsWith('/inventario')) return 'inventory';
    if (path.startsWith('/agregar-producto')) return 'add-product';
    if (path.startsWith('/reportes')) return 'reports';
    if (path.startsWith('/ajustes')) return 'settings';
    return 'pos';
  };

  // Handle header barcode scanned via camera
  const handleHeaderBarcodeScanned = (barcode: string) => {
    const cleanCode = barcode.trim();
    if (!cleanCode) return;

    setGlobalSearchTerm(cleanCode);

    const now = Date.now();
    if (
      now - lastScanRef.current.time < 600 ||
      (cleanCode.toLowerCase() === lastScanRef.current.code.toLowerCase() &&
        now - lastScanRef.current.time < 2000)
    ) {
      return;
    }
    lastScanRef.current = { code: cleanCode, time: now };

    const found =
      findProductByExactCode(inventoryCtrl.products, cleanCode) ||
      findBestProductMatch(inventoryCtrl.products, cleanCode);

    const activeMod = getActiveModule();

    if (activeMod === 'pos') {
      if (found) {
        const res = posCtrl.addToCart(found, 1);
        if (res.success) {
          AudioService.playScanSuccess();
          success(`+1 ${found.name} agregado a la venta`);
        } else {
          AudioService.playScanWarning();
          toastError(res.message || 'Sin existencias suficientes');
        }
      } else {
        AudioService.playScanWarning();
        toastError(`Producto con código "${cleanCode}" no encontrado en inventario`);
      }
    } else if (activeMod === 'inventory') {
      if (found) {
        AudioService.playScanSuccess();
        success(`Producto encontrado: ${found.name}`);
      } else {
        AudioService.playScanWarning();
        info(`No se encontraron productos con código "${cleanCode}"`);
      }
    } else if (activeMod === 'add-product') {
      if (found) {
        setProductToEdit(found);
        setGlobalSearchTerm('');
        info(`Código "${cleanCode}" pertenece a «${found.name}». Modo edición activado.`);
      } else {
        AudioService.playScanSuccess();
        setProductToEdit(null);
        setBarcodeForNewProduct(cleanCode);
        info(`Código "${cleanCode}" auto-ingresado para crear nuevo producto.`);
      }
    } else {
      if (found) {
        navigate('/pos');
        const res = posCtrl.addToCart(found, 1);
        if (res.success) {
          AudioService.playScanSuccess();
          success(`Cambiado a POS: +1 ${found.name} agregado a la venta`);
        } else {
          AudioService.playScanWarning();
          toastError(res.message || 'Sin existencias suficientes');
        }
      } else {
        AudioService.playScanWarning();
        toastError(`Producto con código "${cleanCode}" no encontrado en inventario`);
      }
    }
  };

  // Handle selecting a product from header search dropdown
  const handleSelectProductFromHeader = (product: Product) => {
    const activeMod = getActiveModule();
    if (activeMod === 'pos') {
      const res = posCtrl.addToCart(product, 1);
      if (res.success) {
        AudioService.playBarcodeBeep();
        success(`+1 ${product.name} agregado a la venta`);
        setGlobalSearchTerm('');
      } else {
        AudioService.playScanWarning();
        toastError(res.message || 'Sin existencias suficientes');
      }
    } else if (activeMod === 'inventory') {
      setGlobalSearchTerm(product.barcode || product.name);
      success(`Seleccionado: ${product.name}`);
    } else if (activeMod === 'add-product') {
      setProductToEdit(product);
      setGlobalSearchTerm('');
      info(`Modo edición activado para «${product.name}».`);
    } else {
      navigate('/pos');
      const res = posCtrl.addToCart(product, 1);
      if (res.success) {
        AudioService.playBarcodeBeep();
        success(`Cambiado a POS: +1 ${product.name} agregado a la venta`);
        setGlobalSearchTerm('');
      } else {
        AudioService.playScanWarning();
        toastError(res.message || 'Sin existencias suficientes');
      }
    }
  };

  // Handle start editing product from inventory
  const handleStartEditProduct = (product: Product) => {
    setProductToEdit(product);
    setGlobalSearchTerm('');
    navigate('/agregar-producto');
  };

  // Handle restoring stock when a sale is refunded/cancelled in reports
  const handleCancelSale = (saleId: string) => {
    reportsCtrl.cancelSale(saleId, (itemsToRestore) => {
      let currentProds = [...inventoryCtrl.products];
      for (const item of itemsToRestore) {
        currentProds = currentProds.map((p) =>
          p.id === item.productId
            ? { ...p, stock: p.stock + item.quantity }
            : p
        );
      }
      inventoryCtrl.syncProducts(currentProds);
    });
  };

  const handleDataRestored = () => {
    inventoryCtrl.reloadFromStorage();
    settingsCtrl.reloadSettings();
    sessionCtrl.reloadSessions();
    reportsCtrl.loadSales();
  };

  const currenciesList = [
    {
      code: 'VES',
      symbol: 'Bs.',
      name: 'Bolívar (VES)',
      rateToBase: 1.0,
      isBase: true,
      decimalPlaces: 2,
    },
    {
      code: 'USD',
      symbol: '$',
      name: 'Dólar (USD)',
      rateToBase: settingsCtrl.settings.exchangeRateUsdToBs > 0 ? 1 / settingsCtrl.settings.exchangeRateUsdToBs : 0,
      isBase: false,
      decimalPlaces: 2,
    },
  ];

  return (
    <AppContext.Provider
      value={{
        inventoryCtrl,
        settingsCtrl,
        sessionCtrl,
        reportsCtrl,
        posCtrl,
        globalSearchTerm,
        setGlobalSearchTerm,
        barcodeForNewProduct,
        setBarcodeForNewProduct,
        productToEdit,
        setProductToEdit,
        currenciesList,
        handleHeaderBarcodeScanned,
        handleSelectProductFromHeader,
        handleStartEditProduct,
        handleCancelSale,
        handleDataRestored,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
