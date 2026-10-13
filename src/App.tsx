import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '../components/ui/ToastContext';
import { AppProvider } from './context/AppContext';
import { RootLayout } from './routes/RootLayout';
import { POSRoute } from './routes/POSRoute';
import { InventoryRoute } from './routes/InventoryRoute';
import { AddProductRoute } from './routes/AddProductRoute';
import { ReportsRoute } from './routes/ReportsRoute';
import { SettingsRoute } from './routes/SettingsRoute';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppProvider>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<Navigate to="/pos" replace />} />
              <Route path="pos" element={<POSRoute />} />
              <Route path="inventario" element={<InventoryRoute />} />
              <Route path="agregar-producto" element={<AddProductRoute />} />
              <Route path="reportes" element={<ReportsRoute />} />
              <Route path="ajustes" element={<SettingsRoute />} />
              <Route path="*" element={<Navigate to="/pos" replace />} />
            </Route>
          </Routes>
        </AppProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
