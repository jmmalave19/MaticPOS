export type CommissionTarget = 'total_sales' | 'gross_profit';

export interface CommissionSettings {
  enabled: boolean;
  ratePercent: number; // e.g. 5 for 5%
  target: CommissionTarget; // 'total_sales' (Total en ventas) | 'gross_profit' (Ganancias de ventas)
}

export type ExchangeRateMode = 'manual' | 'auto';

export interface AppSettings {
  exchangeRateUsdToBs: number; // 1 USD = X Bs.
  exchangeRateMode: ExchangeRateMode; // 'manual' | 'auto'
  exchangeRateLastSync?: string; // Fecha y hora ISO de la última sincronización
  exchangeRateSourceDate?: string; // Fecha de actualización devuelta por la API
  commission: CommissionSettings;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  exchangeRateUsdToBs: 36.5,
  exchangeRateMode: 'manual',
  commission: {
    enabled: false,
    ratePercent: 5,
    target: 'total_sales',
  },
};
