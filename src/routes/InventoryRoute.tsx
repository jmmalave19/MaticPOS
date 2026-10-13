import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { InventoryView } from '../../components/inventory/InventoryView';

export function InventoryRoute() {
  const navigate = useNavigate();
  const {
    inventoryCtrl,
    globalSearchTerm,
    setProductToEdit,
    handleStartEditProduct,
  } = useAppContext();

  return (
    <InventoryView
      products={inventoryCtrl.products}
      onDeleteProduct={inventoryCtrl.deleteProduct}
      onEditProduct={handleStartEditProduct}
      onNavigateToAddProduct={() => {
        setProductToEdit(null);
        navigate('/agregar-producto');
      }}
      searchTerm={globalSearchTerm}
      adjustments={inventoryCtrl.adjustments}
      onAdjustStock={inventoryCtrl.adjustStock}
    />
  );
}
