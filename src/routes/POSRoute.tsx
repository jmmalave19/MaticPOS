import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { POSView } from '../../components/pos/POSView';

export function POSRoute() {
  const navigate = useNavigate();
  const {
    inventoryCtrl,
    posCtrl,
    settingsCtrl,
    sessionCtrl,
    currenciesList,
    globalSearchTerm,
    setGlobalSearchTerm,
  } = useAppContext();

  return (
    <POSView
      products={inventoryCtrl.products}
      categories={inventoryCtrl.categories}
      cart={posCtrl.cart}
      subtotalBs={posCtrl.subtotalBs}
      discountPercent={posCtrl.discountPercent}
      discountAmountBs={posCtrl.discountAmountBs}
      totalBs={posCtrl.totalBs}
      totalUsd={posCtrl.totalUsd}
      totalItemsCount={posCtrl.totalItemsCount}
      onAddToCart={posCtrl.addToCart}
      onUpdateQuantity={posCtrl.updateQuantity}
      onRemoveFromCart={posCtrl.removeFromCart}
      onClearCart={posCtrl.clearCart}
      onSetDiscountPercent={posCtrl.setDiscountPercent}
      onCompleteSale={posCtrl.completeSale}
      lastCompletedSale={posCtrl.lastCompletedSale}
      onCloseReceipt={() => posCtrl.setLastCompletedSale(null)}
      baseCurrency={currenciesList[0]}
      activeDisplayCurrency={currenciesList[0]}
      currencies={currenciesList}
      formatAmount={(amt) => settingsCtrl.formatBs(amt)}
      convertFromBase={(amt) => amt}
      formatBs={settingsCtrl.formatBs}
      formatUsd={settingsCtrl.formatUsd}
      onNavigateToInventory={() => navigate('/inventario')}
      onNavigateToAddProduct={() => navigate('/agregar-producto')}
      isDayOpen={sessionCtrl.isDayOpen}
      onStartDayClick={() => navigate('/reportes')}
      exchangeRateUsdToBs={settingsCtrl.settings.exchangeRateUsdToBs}
      searchTerm={globalSearchTerm}
      onSearchChange={setGlobalSearchTerm}
    />
  );
}
