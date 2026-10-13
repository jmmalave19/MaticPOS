import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Header } from '../../components/layout/Header';
import { BottomNav, AppModule } from '../../components/layout/BottomNav';

export function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    inventoryCtrl,
    settingsCtrl,
    sessionCtrl,
    posCtrl,
    globalSearchTerm,
    setGlobalSearchTerm,
    handleHeaderBarcodeScanned,
    handleSelectProductFromHeader,
  } = useAppContext();

  const getActiveModule = (): AppModule => {
    const path = location.pathname;
    if (path.startsWith('/inventario')) return 'inventory';
    if (path.startsWith('/agregar-producto')) return 'add-product';
    if (path.startsWith('/reportes')) return 'reports';
    if (path.startsWith('/ajustes')) return 'settings';
    return 'pos';
  };

  const activeModule = getActiveModule();

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased selection:bg-slate-800 selection:text-white">
      {/* Header transparente con buscador y lector de códigos de barra (solo en POS, Inventario y Crear/Editar) */}
      {activeModule !== 'reports' && activeModule !== 'settings' && (
        <Header
          activeModule={activeModule}
          searchTerm={globalSearchTerm}
          onSearchChange={(val) => {
            setGlobalSearchTerm(val);
            if (val && activeModule !== 'pos' && activeModule !== 'inventory' && activeModule !== 'add-product') {
              navigate('/pos');
            }
          }}
          onBarcodeScanned={handleHeaderBarcodeScanned}
          products={inventoryCtrl.products}
          onSelectProduct={handleSelectProductFromHeader}
          exchangeRateUsdToBs={settingsCtrl.settings.exchangeRateUsdToBs}
          formatBs={settingsCtrl.formatBs}
          formatUsd={settingsCtrl.formatUsd}
        />
      )}

      {/* Main Module Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-3 sm:pt-4">
        <Outlet />
      </main>

      {/* Ergonomic Navigation Bar for all 5 modules */}
      <BottomNav
        activeModule={activeModule}
        cartCount={posCtrl.totalItemsCount}
        lowStockCount={inventoryCtrl.lowStockProducts.length}
        isDayOpen={sessionCtrl.isDayOpen}
      />
    </div>
  );
}
