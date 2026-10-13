export interface Currency {
  code: string; // e.g. "USD", "VES", "EUR", "MXN", "COP"
  symbol: string; // e.g. "$", "Bs.", "€", "MX$", "COL$"
  name: string; // e.g. "Dólar Estadounidense", "Bolívar", "Euro"
  rateToBase: number; // 1 Base Currency = X of this currency (Base is always 1.0)
  isBase: boolean;
  decimalPlaces: number;
}

export interface CurrencyConfig {
  baseCurrencyCode: string; // default "USD"
  activeDisplayCurrencyCode: string; // current active display currency
  currencies: Currency[];
  lastUpdated: string;
}

export const DEFAULT_CURRENCIES: Currency[] = [
  {
    code: 'USD',
    symbol: '$',
    name: 'Dólar Estadounidense (USD)',
    rateToBase: 1.0,
    isBase: true,
    decimalPlaces: 2,
  },
  {
    code: 'VES',
    symbol: 'Bs.',
    name: 'Bolívar Digital (VES)',
    rateToBase: 36.5,
    isBase: false,
    decimalPlaces: 2,
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro (EUR)',
    rateToBase: 0.92,
    isBase: false,
    decimalPlaces: 2,
  },
  {
    code: 'MXN',
    symbol: 'MX$',
    name: 'Peso Mexicano (MXN)',
    rateToBase: 17.2,
    isBase: false,
    decimalPlaces: 2,
  },
  {
    code: 'COP',
    symbol: 'COL$',
    name: 'Peso Colombiano (COP)',
    rateToBase: 3950.0,
    isBase: false,
    decimalPlaces: 0,
  },
];
