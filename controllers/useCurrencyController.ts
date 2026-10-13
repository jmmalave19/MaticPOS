'use client';

import { useState, useEffect, useCallback } from 'react';
import { Currency, CurrencyConfig, DEFAULT_CURRENCIES } from '../models/currency.model';
import { StorageService } from '../services/storage.service';

export function useCurrencyController() {
  const [config, setConfig] = useState<CurrencyConfig>(() => StorageService.getCurrencyConfig());
  const [isLoaded] = useState(true);

  // Update active display currency (e.g. switch view between USD and VES or EUR)
  const setActiveDisplayCurrency = useCallback((currencyCode: string) => {
    setConfig((prev) => {
      const updated = {
        ...prev,
        activeDisplayCurrencyCode: currencyCode,
      };
      StorageService.saveCurrencyConfig(updated);
      return updated;
    });
  }, []);

  // Update exchange rate for a currency against base currency
  const updateExchangeRate = useCallback((currencyCode: string, newRate: number) => {
    if (newRate <= 0) return;
    setConfig((prev) => {
      const updatedCurrencies = prev.currencies.map((curr) => {
        if (curr.code === currencyCode) {
          return { ...curr, rateToBase: newRate };
        }
        return curr;
      });
      const updated: CurrencyConfig = {
        ...prev,
        currencies: updatedCurrencies,
        lastUpdated: new Date().toISOString(),
      };
      StorageService.saveCurrencyConfig(updated);
      return updated;
    });
  }, []);

  // Add or update custom currency
  const upsertCurrency = useCallback((newCurrency: Currency) => {
    setConfig((prev) => {
      const exists = prev.currencies.some((c) => c.code === newCurrency.code);
      const updatedCurrencies = exists
        ? prev.currencies.map((c) => (c.code === newCurrency.code ? newCurrency : c))
        : [...prev.currencies, newCurrency];

      const updated: CurrencyConfig = {
        ...prev,
        currencies: updatedCurrencies,
        lastUpdated: new Date().toISOString(),
      };
      StorageService.saveCurrencyConfig(updated);
      return updated;
    });
  }, []);

  // Set base currency
  const setBaseCurrency = useCallback((newBaseCode: string) => {
    setConfig((prev) => {
      const oldBase = prev.currencies.find((c) => c.code === prev.baseCurrencyCode);
      const targetCurr = prev.currencies.find((c) => c.code === newBaseCode);
      if (!targetCurr || targetCurr.rateToBase <= 0) return prev;

      // Recalculate relative rates if base changes
      const conversionFactor = targetCurr.rateToBase;
      const updatedCurrencies = prev.currencies.map((c) => ({
        ...c,
        isBase: c.code === newBaseCode,
        rateToBase: Number((c.rateToBase / conversionFactor).toFixed(4)),
      }));

      const updated: CurrencyConfig = {
        ...prev,
        baseCurrencyCode: newBaseCode,
        currencies: updatedCurrencies,
        lastUpdated: new Date().toISOString(),
      };
      StorageService.saveCurrencyConfig(updated);
      return updated;
    });
  }, []);

  // Helpers
  const baseCurrency = config.currencies.find((c) => c.code === config.baseCurrencyCode) || {
    code: 'USD',
    symbol: '$',
    name: 'Dólar',
    rateToBase: 1.0,
    isBase: true,
    decimalPlaces: 2,
  };

  const activeDisplayCurrency =
    config.currencies.find((c) => c.code === config.activeDisplayCurrencyCode) || baseCurrency;

  const getCurrency = useCallback(
    (code: string): Currency => {
      return (
        config.currencies.find((c) => c.code === code) || {
          code,
          symbol: code,
          name: code,
          rateToBase: 1.0,
          isBase: code === config.baseCurrencyCode,
          decimalPlaces: 2,
        }
      );
    },
    [config.currencies, config.baseCurrencyCode]
  );

  // Convert an amount given in base currency into target currency
  const convertFromBase = useCallback(
    (amountInBase: number, targetCurrencyCode?: string): number => {
      const code = targetCurrencyCode || config.activeDisplayCurrencyCode;
      const target = getCurrency(code);
      return Number((amountInBase * target.rateToBase).toFixed(target.decimalPlaces));
    },
    [config.activeDisplayCurrencyCode, getCurrency]
  );

  // Format an amount in a specific currency code
  const formatAmount = useCallback(
    (amount: number, currencyCode?: string): string => {
      const curr = getCurrency(currencyCode || config.baseCurrencyCode);
      const formattedNumber = new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: curr.decimalPlaces,
        maximumFractionDigits: curr.decimalPlaces,
      }).format(amount);
      return `${curr.symbol} ${formattedNumber}`;
    },
    [config.baseCurrencyCode, getCurrency]
  );

  // Format an amount stored in base currency into active display currency
  const formatInActive = useCallback(
    (amountInBase: number): string => {
      const converted = convertFromBase(amountInBase, config.activeDisplayCurrencyCode);
      return formatAmount(converted, config.activeDisplayCurrencyCode);
    },
    [convertFromBase, formatAmount, config.activeDisplayCurrencyCode]
  );

  // Format dual prices: e.g. "$ 10,00 (Bs. 365,00)" when active display currency differs from base
  const formatDualPrice = useCallback(
    (amountInBase: number): { baseStr: string; secondaryStr: string | null } => {
      const baseStr = formatAmount(amountInBase, config.baseCurrencyCode);
      if (config.activeDisplayCurrencyCode === config.baseCurrencyCode) {
        return { baseStr, secondaryStr: null };
      }
      const secondaryVal = convertFromBase(amountInBase, config.activeDisplayCurrencyCode);
      const secondaryStr = formatAmount(secondaryVal, config.activeDisplayCurrencyCode);
      return { baseStr, secondaryStr };
    },
    [formatAmount, convertFromBase, config.baseCurrencyCode, config.activeDisplayCurrencyCode]
  );

  return {
    config,
    isLoaded,
    baseCurrency,
    activeDisplayCurrency,
    currencies: config.currencies,
    setActiveDisplayCurrency,
    updateExchangeRate,
    upsertCurrency,
    setBaseCurrency,
    getCurrency,
    convertFromBase,
    formatAmount,
    formatInActive,
    formatDualPrice,
  };
}
