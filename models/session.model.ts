export interface WorkDaySession {
  id: string;
  status: 'open' | 'closed';
  dateString: string; // YYYY-MM-DD
  openedAt: string; // ISO timestamp
  closedAt?: string; // ISO timestamp
  initialCashBs: number;
  initialCashUsd: number;
  closingNotes?: string;

  // Snapshot calculated upon closing the day
  totalSalesCount?: number;
  totalSalesBs?: number;
  totalSalesUsd?: number;
  grossProfitBs?: number;
  grossProfitUsd?: number;
  commissionBs?: number;
  commissionUsd?: number;
  
  // Breakdown by payment method at close (in Bs and USD)
  breakdown?: {
    efectivoBs: number;
    efectivoUsd: number;
    divisaBs: number;
    divisaUsd: number;
    tarjetaBs: number;
    tarjetaUsd: number;
    pagoMovilBs: number;
    pagoMovilUsd: number;
    biopagoBs: number;
    biopagoUsd: number;
    transferenciaBs: number;
    otroBs: number;
  };

  // Expected register cash (initial + sales in cash)
  expectedCashBs?: number;
  expectedCashUsd?: number;
}
