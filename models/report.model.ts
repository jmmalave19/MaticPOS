import { PaymentMethod, Sale } from './sale.model';
import { CommissionTarget } from './settings.model';
import { StockAdjustment } from './product.model';

export interface DailyReportSummary {
  dateString: string; // YYYY-MM-DD
  totalSalesCount: number;
  totalItemsSold: number;

  // Primary and secondary currency totals
  totalRevenueBs: number;
  totalRevenueUsd: number;
  totalCostBs: number;
  totalCostUsd: number;
  grossProfitBs: number;
  grossProfitUsd: number;
  profitMarginPercent: number;

  // Commission calculation
  commissionEnabled: boolean;
  commissionPercent: number;
  commissionTarget: CommissionTarget;
  commissionBs: number;
  commissionUsd: number;

  // Backwards compatibility
  totalRevenueBase: number;
  totalCostBase: number;
  grossProfitBase: number;

  paymentMethodBreakdown: {
    method: PaymentMethod;
    label: string;
    count: number;
    totalBs: number;
    totalUsd: number;
    totalBase: number;
    percentage: number;
  }[];

  topProducts: {
    productId: string;
    name: string;
    quantity: number;
    revenueBs: number;
    revenueUsd: number;
    revenueBase: number;
  }[];

  sales: Sale[];
  adjustments?: StockAdjustment[];
}
