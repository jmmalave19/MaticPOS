import { Product } from './product.model';

export type PaymentMethod =
  | 'efectivo'
  | 'divisa'
  | 'tarjeta'
  | 'pago_movil'
  | 'biopago'
  | 'transferencia'
  | 'otro';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo (Bs.)',
  divisa: 'Divisa ($)',
  tarjeta: 'Tarjeta / Punto de Venta',
  pago_movil: 'Pago Móvil',
  biopago: 'BioPago',
  transferencia: 'Transferencia Bancaria',
  otro: 'Otro Método',
};

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  barcode: string;
  quantity: number;
  unitPriceBs: number;
  unitPriceUsd: number;
  totalBs: number;
  totalUsd: number;
  unitCostBs: number;
  unitCostUsd: number;

  // Backwards compatibility
  unitPriceBase: number;
  totalBase: number;
  unitCostBase: number;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  sessionId?: string; // ID of the active work day session
  items: SaleItem[];
  subtotalBs: number;
  discountBs: number;
  totalBs: number; // Primary currency
  totalUsd: number; // Secondary currency
  exchangeRateAtSale: number; // Bs per USD

  // Backwards compatibility fields
  subtotalBase: number;
  discountBase: number;
  totalBase: number;
  currencyCode: string;
  currencySymbol: string;
  totalInCurrency: number;

  paymentMethod: PaymentMethod;
  amountTenderedInCurrency: number;
  changeGivenInCurrency: number;

  customerName?: string;
  customerDoc?: string;
  notes?: string;
  timestamp: string; // ISO string
}
