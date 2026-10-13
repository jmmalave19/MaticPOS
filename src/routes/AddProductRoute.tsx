import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { AddProductView } from '../../components/inventory/AddProductView';

export function AddProductRoute() {
  const navigate = useNavigate();
  const {
    inventoryCtrl,
    settingsCtrl,
    productToEdit,
    setProductToEdit,
    barcodeForNewProduct,
  } = useAppContext();

  return (
    <AddProductView
      key={productToEdit ? `edit-${productToEdit.id}` : (barcodeForNewProduct || 'new-product')}
      productToEdit={productToEdit}
      products={inventoryCtrl.products}
      onAddProduct={inventoryCtrl.addProduct}
      onUpdateProduct={inventoryCtrl.updateProduct}
      onCancelEdit={() => {
        setProductToEdit(null);
        navigate('/inventario');
      }}
      exchangeRateUsdToBs={settingsCtrl.settings.exchangeRateUsdToBs}
      existingCategories={inventoryCtrl.categories}
      onNavigateToInventory={() => {
        setProductToEdit(null);
        navigate('/inventario');
      }}
      formatBs={settingsCtrl.formatBs}
      formatUsd={settingsCtrl.formatUsd}
      initialBarcode={barcodeForNewProduct}
    />
  );
}
