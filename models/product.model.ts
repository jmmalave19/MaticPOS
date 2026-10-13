export interface Product {
  id: string;
  name: string;
  barcode: string; // barcode string scanned or manually inputted
  category: string;
  priceCurrency: 'USD' | 'VES'; // Moneda elegida para guardar/fijar el producto
  priceUsd: number; // Precio fijado en dólares
  priceBs: number; // Precio en Bolívares (Moneda Principal)
  costUsd: number; // Costo en dólares (opcional)
  costBs: number; // Costo en Bolívares
  sellingPrice: number; // Equivalente a priceBs para retrocompatibilidad
  costPrice: number; // Equivalente a costBs para retrocompatibilidad
  stock: number; // Unidades disponibles
  minStockAlert: number; // Umbral de alerta
  allowSellWithoutStock?: boolean; // Permitir vender aun sin existencias en POS
  notes?: string;
  movements?: StockAdjustment[]; // Historial de movimientos propio del producto
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  description?: string;
  previousStock: number;
  newStock: number;
  timestamp: string;
}
