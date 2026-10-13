'use client';

import React, { useState, useId } from 'react';
import { Product, ProductInput } from '../../models/product.model';
import { useToast } from '../ui/ToastContext';
import { getProductBarcode, isExactProductCodeMatch } from '../../lib/product-matcher';
import {
  Barcode,
  TrendingUp,
  DollarSign,
  ShieldAlert,
  Lock,
} from 'lucide-react';

interface AddProductViewProps {
  onAddProduct: (input: ProductInput) => { success: boolean; error?: string };
  onUpdateProduct?: (id: string, input: ProductInput) => { success: boolean; error?: string };
  productToEdit?: Product | null;
  products?: Product[];
  onCancelEdit?: () => void;
  exchangeRateUsdToBs: number;
  existingCategories?: string[];
  onNavigateToInventory: () => void;
  formatBs: (amount: number) => string;
  formatUsd: (amount: number) => string;
  initialBarcode?: string;
}

export function AddProductView({
  onAddProduct,
  onUpdateProduct,
  productToEdit,
  products = [],
  onCancelEdit,
  exchangeRateUsdToBs,
  onNavigateToInventory,
  formatBs,
  formatUsd,
  initialBarcode,
}: AddProductViewProps) {
  const { success, error: toastError, info } = useToast();
  const allowSellWithoutStockId = useId();

  // Buscar si el código inicial o el producto pasado coincide con un producto existente
  const initialMatchedProduct =
    productToEdit ||
    (initialBarcode && products.length > 0
      ? products.find((p) => isExactProductCodeMatch(p, initialBarcode))
      : null) ||
    null;

  const [activeEditingProduct, setActiveEditingProduct] = useState<Product | null>(
    initialMatchedProduct
  );
  const isEditing = !!activeEditingProduct;

  // Initial values based on whether we are editing or creating
  const initCurrency = activeEditingProduct?.priceCurrency || 'USD';
  const initBarcode = activeEditingProduct
    ? getProductBarcode(activeEditingProduct)
    : (initialBarcode || '');
  const initName = activeEditingProduct?.name || '';

  const initCost = activeEditingProduct
    ? (initCurrency === 'VES'
        ? (activeEditingProduct.costBs || activeEditingProduct.costPrice || 0)
        : (activeEditingProduct.costUsd || (exchangeRateUsdToBs > 0 ? (activeEditingProduct.costBs || 0) / exchangeRateUsdToBs : 0)))
    : 0;

  const initPrice = activeEditingProduct
    ? (initCurrency === 'VES'
        ? (activeEditingProduct.priceBs || activeEditingProduct.sellingPrice || 0)
        : (activeEditingProduct.priceUsd || (exchangeRateUsdToBs > 0 ? (activeEditingProduct.priceBs || 0) / exchangeRateUsdToBs : 0)))
    : 0;

  // Form states in strict order
  // 1. Nombre
  const [name, setName] = useState(initName);
  const [barcode, setBarcode] = useState(initBarcode);

  // 2. Moneda ('USD' | 'VES')
  const [currency, setCurrency] = useState<'USD' | 'VES'>(initCurrency);

  // 3. Precio de costo (en la moneda seleccionada)
  const [costPriceStr, setCostPriceStr] = useState(initCost > 0 ? String(initCost) : '');

  // 4. Precio de venta (en la moneda seleccionada)
  const [sellingPriceStr, setSellingPriceStr] = useState(initPrice > 0 ? String(initPrice) : '');

  // 5. Stock inicial (una vez creado el producto el stock no puede ser alterado manualmente)
  const [stockStr, setStockStr] = useState(String(activeEditingProduct?.stock ?? 0));

  // 6. Vender sin stock
  const [allowSellWithoutStock, setAllowSellWithoutStock] = useState(
    activeEditingProduct?.allowSellWithoutStock ?? false
  );

  // Cargar datos de producto existente en el formulario
  const populateFromProduct = (prod: Product) => {
    setName(prod.name);
    const pCur = prod.priceCurrency || 'USD';
    setCurrency(pCur);

    const cCost =
      pCur === 'VES'
        ? prod.costBs || prod.costPrice || 0
        : prod.costUsd || (exchangeRateUsdToBs > 0 ? (prod.costBs || 0) / exchangeRateUsdToBs : 0);

    const cPrice =
      pCur === 'VES'
        ? prod.priceBs || prod.sellingPrice || 0
        : prod.priceUsd || (exchangeRateUsdToBs > 0 ? (prod.priceBs || 0) / exchangeRateUsdToBs : 0);

    setCostPriceStr(cCost > 0 ? String(cCost) : '');
    setSellingPriceStr(cPrice > 0 ? String(cPrice) : '');
    setStockStr(String(prod.stock ?? 0));
    setAllowSellWithoutStock(!!prod.allowSellWithoutStock);
  };

  // Manejar cambio en el código de barras: si coincide con uno existente, entra en modo edición automáticamente
  const handleBarcodeChange = (val: string) => {
    setBarcode(val);
    const clean = val.trim();
    if (!clean || products.length === 0) {
      if (!productToEdit && activeEditingProduct) {
        setActiveEditingProduct(null);
      }
      return;
    }

    // Buscar si ya existe un producto con este código exacto en el inventario
    const existing = products.find((p) => {
      if (activeEditingProduct && p.id === activeEditingProduct.id) {
        return false;
      }
      return isExactProductCodeMatch(p, clean);
    });

    if (existing) {
      setActiveEditingProduct(existing);
      populateFromProduct(existing);
      info(`Código existente: cargado «${existing.name}» en modo de edición.`);
    } else if (!productToEdit && activeEditingProduct) {
      // Si el código ya no coincide con un producto existente y no se abrió desde editar en inventario
      setActiveEditingProduct(null);
    }
  };

  // Parse numerical values
  const cost = Math.max(0, parseFloat(costPriceStr) || 0);
  const price = Math.max(0, parseFloat(sellingPriceStr) || 0);
  const stock = Math.max(0, parseInt(stockStr, 10) || 0);

  // Profit calculations in the selected currency
  const hasCost = cost > 0;
  const hasPrice = price > 0;
  const unitProfit = price - cost;
  const profitMarginCost = hasCost ? ((unitProfit / cost) * 100) : (hasPrice ? 100 : 0);
  const profitMarginSale = hasPrice ? ((unitProfit / price) * 100) : 0;
  const totalPotentialProfit = unitProfit * stock;
  const totalInvestment = cost * stock;
  const totalSalesRevenue = price * stock;

  // Currency conversion helpers
  const formatValueInSelected = (amount: number) => {
    return currency === 'USD' ? formatUsd(amount) : formatBs(amount);
  };

  const formatValueInAlternate = (amount: number) => {
    if (exchangeRateUsdToBs <= 0) return '';
    if (currency === 'USD') {
      return formatBs(amount * exchangeRateUsdToBs);
    } else {
      return formatUsd(amount / exchangeRateUsdToBs);
    }
  };

  const handleCurrencySwitch = (newCurrency: 'USD' | 'VES') => {
    if (newCurrency === currency) return;
    
    // Automatically convert values to the new currency using exchange rate
    if (exchangeRateUsdToBs > 0) {
      if (newCurrency === 'VES') {
        // From USD to VES
        if (costPriceStr !== '') {
          setCostPriceStr((cost * exchangeRateUsdToBs).toFixed(2));
        }
        if (sellingPriceStr !== '') {
          setSellingPriceStr((price * exchangeRateUsdToBs).toFixed(2));
        }
      } else {
        // From VES to USD
        if (costPriceStr !== '') {
          setCostPriceStr((cost / exchangeRateUsdToBs).toFixed(2));
        }
        if (sellingPriceStr !== '') {
          setSellingPriceStr((price / exchangeRateUsdToBs).toFixed(2));
        }
      }
    }
    setCurrency(newCurrency);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = name.trim();
    if (!cleanName) {
      toastError('El nombre del producto es obligatorio.');
      return;
    }

    if (price <= 0) {
      toastError('Ingresa un precio de venta mayor a cero.');
      return;
    }

    // Determine values for both currencies
    let pUsd = 0;
    let pBs = 0;
    let cUsd = 0;
    let cBs = 0;

    if (currency === 'USD') {
      pUsd = price;
      pBs = exchangeRateUsdToBs > 0 ? Number((price * exchangeRateUsdToBs).toFixed(2)) : 0;
      cUsd = cost;
      cBs = exchangeRateUsdToBs > 0 ? Number((cost * exchangeRateUsdToBs).toFixed(2)) : 0;
    } else {
      pBs = price;
      pUsd = exchangeRateUsdToBs > 0 ? Number((price / exchangeRateUsdToBs).toFixed(2)) : 0;
      cBs = cost;
      cUsd = exchangeRateUsdToBs > 0 ? Number((cost / exchangeRateUsdToBs).toFixed(2)) : 0;
    }

    const input: ProductInput = {
      name: cleanName,
      barcode: barcode.trim(),
      category: 'General',
      priceCurrency: currency,
      priceUsd: pUsd,
      priceBs: pBs,
      costUsd: cUsd,
      costBs: cBs,
      sellingPrice: pBs,
      costPrice: cBs,
      stock,
      minStockAlert: 3,
      allowSellWithoutStock,
    };

    if (isEditing && activeEditingProduct && onUpdateProduct) {
      const res = onUpdateProduct(activeEditingProduct.id, input);
      if (res.success) {
        success(`Producto "${cleanName}" actualizado correctamente.`);
        if (onCancelEdit) {
          onCancelEdit();
        } else {
          onNavigateToInventory();
        }
      } else if (res.error) {
        toastError(res.error);
      }
      return;
    }

    const res = onAddProduct(input);
    if (res.success) {
      success(`Producto "${cleanName}" creado correctamente.`);
      // Reset form
      setName('');
      setBarcode('');
      setCostPriceStr('');
      setSellingPriceStr('');
      setStockStr('0');
      setAllowSellWithoutStock(false);
    } else if (res.error) {
      toastError(res.error);
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-28 pt-2">
      {/* Top Bar Minimalista */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {isEditing ? 'Editar Producto' : 'Crear Producto'}
          </h1>
          {isEditing && activeEditingProduct && (
            <p className="text-xs text-slate-500 mt-0.5">
              Modificando: <span className="font-semibold text-slate-700">{activeEditingProduct.name}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={isEditing && onCancelEdit ? onCancelEdit : onNavigateToInventory}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          {isEditing ? 'Cancelar' : 'Ver Inventario'}
        </button>
      </div>

      {/* Formulario Principal Minimalista */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5"
      >
        {/* 1. Nombre */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Nombre
          </label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Arroz Blanco 1kg"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 font-medium text-slate-900 placeholder:text-slate-400 transition-all"
          />
        </div>

        {/* Código de barras / Código del producto */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800">
              Código de barras / Código
            </label>
            <span className="text-[11px] text-slate-500 font-medium">
              (Opcional para escáner y búsqueda ágil)
            </span>
          </div>
          <div className="relative">
            <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={barcode}
              onChange={(e) => handleBarcodeChange(e.target.value)}
              placeholder="Ej. 7501031311309 o código corto"
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 font-mono text-slate-900 placeholder:text-slate-400 transition-all"
            />
          </div>
          {isEditing && activeEditingProduct && (
            <div className="mt-1.5 p-2 bg-slate-100/90 border border-slate-200/80 rounded-xl flex items-center gap-2 text-xs text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0" />
              <span className="truncate">
                Código existente: editando <strong>«{activeEditingProduct.name}»</strong>
              </span>
            </div>
          )}
        </div>

        {/* 2. Moneda */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Moneda
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleCurrencySwitch('USD')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                currency === 'USD'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-slate-700" />
              <span>Dólares ($ USD)</span>
            </button>

            <button
              type="button"
              onClick={() => handleCurrencySwitch('VES')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                currency === 'VES'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Bolívares (Bs. VES)</span>
            </button>
          </div>
        </div>

        {/* 3. Precio de costo */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800">
              Precio de costo
            </label>
            {cost > 0 && exchangeRateUsdToBs > 0 && (
              <span className="text-[11px] text-slate-500 font-medium">
                Equivalente: {formatValueInAlternate(cost)}
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
              {currency === 'USD' ? '$' : 'Bs.'}
            </span>
            <input
              type="number"
              step="any"
              min="0"
              value={costPriceStr}
              onChange={(e) => setCostPriceStr(e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 font-semibold text-slate-900 placeholder:text-slate-400 transition-all"
            />
          </div>
        </div>

        {/* 4. Precio de venta */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800">
              Precio de venta
            </label>
            {price > 0 && exchangeRateUsdToBs > 0 && (
              <span className="text-[11px] text-slate-500 font-medium">
                Equivalente: {formatValueInAlternate(price)}
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
              {currency === 'USD' ? '$' : 'Bs.'}
            </span>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={sellingPriceStr}
              onChange={(e) => setSellingPriceStr(e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 font-bold text-slate-900 placeholder:text-slate-400 transition-all"
            />
          </div>
        </div>

        {/* 5. Stock */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800">
              {isEditing ? 'Stock actual' : 'Stock inicial'}
            </label>
            {isEditing && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                <Lock className="w-3 h-3 text-slate-400" />
                No editable manualmente
              </span>
            )}
          </div>
          <input
            type="number"
            min="0"
            step="1"
            disabled={isEditing}
            value={stockStr}
            onChange={(e) => setStockStr(e.target.value)}
            placeholder="0"
            className={`w-full px-3.5 py-2.5 text-sm border rounded-xl font-semibold transition-all ${
              isEditing
                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none'
                : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800'
            }`}
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            {isEditing
              ? '(El stock existente no se altera al editar detalles del producto. Usa Ajustes de stock para movimientos)'
              : '(Una vez creado el producto el stock no puede ser alterado manualmente)'}
          </p>
        </div>

        {/* ESTADÍSTICA DE GANANCIAS DEL PRODUCTO (DEBAJO DEL STOCK) */}
        <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-slate-700" />
              Estadística de ganancias
            </span>
            {hasPrice && hasCost && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  unitProfit >= 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {unitProfit >= 0 ? '+' : ''}
                {profitMarginCost.toFixed(1)}% margen
              </span>
            )}
          </div>

          {hasPrice ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Ganancia por unidad */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Ganancia Unitaria
                </span>
                <span
                  className={`text-sm font-bold block mt-0.5 ${
                    unitProfit > 0
                      ? 'text-emerald-700'
                      : unitProfit < 0
                      ? 'text-rose-700'
                      : 'text-slate-800'
                  }`}
                >
                  {formatValueInSelected(unitProfit)}
                </span>
                {hasCost && (
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {profitMarginSale.toFixed(1)}% sobre venta
                  </span>
                )}
              </div>

              {/* Ganancia Potencial Total */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Ganancia Total (Stock)
                </span>
                <span
                  className={`text-sm font-bold block mt-0.5 ${
                    totalPotentialProfit > 0
                      ? 'text-emerald-700'
                      : totalPotentialProfit < 0
                      ? 'text-rose-700'
                      : 'text-slate-800'
                  }`}
                >
                  {formatValueInSelected(totalPotentialProfit)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Con {stock} unid. iniciales
                </span>
              </div>

              {/* Inversión en Stock */}
              <div className="col-span-2 sm:col-span-1 bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Inversión en Costo
                </span>
                <span className="text-sm font-bold text-slate-800 block mt-0.5">
                  {formatValueInSelected(totalInvestment)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Valor Venta: {formatValueInSelected(totalSalesRevenue)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Ingresa el precio de venta y costo para visualizar las proyecciones de ganancia.
            </p>
          )}

          {hasPrice && hasCost && unitProfit < 0 && (
            <div className="flex items-center gap-1.5 text-xs text-rose-700 font-medium pt-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Advertencia: El precio de venta es menor al costo de adquisición.</span>
            </div>
          )}
        </div>

        {/* 6. Vender sin stock */}
        <div className="pt-1">
          <label
            htmlFor={allowSellWithoutStockId}
            className="flex items-start gap-3 p-3 bg-slate-50/70 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <input
              id={allowSellWithoutStockId}
              type="checkbox"
              checked={allowSellWithoutStock}
              onChange={(e) => setAllowSellWithoutStock(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-800 cursor-pointer"
            />
            <div className="flex-1">
              <span className="text-xs font-bold text-slate-900 block select-none">
                Vender sin stock
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed select-none">
                Permite registrar ventas de este producto en caja aunque no existan unidades en inventario.
              </span>
            </div>
          </label>
        </div>

        {/* Botón Guardar / Crear */}
        <div className="pt-2 flex items-center gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit ? onCancelEdit : onNavigateToInventory}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer select-none"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer select-none active:scale-[0.99]"
          >
            {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
          </button>
        </div>
      </form>
    </div>
  );
}
