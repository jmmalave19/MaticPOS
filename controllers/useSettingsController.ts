'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppSettings, CommissionSettings, ExchangeRateMode, DEFAULT_APP_SETTINGS } from '../models/settings.model';
import { StorageService } from '../services/storage.service';
import { FirestoreService } from '../services/firestore.service';
import { DolarApiService } from '../services/dolarApi.service';

export function useSettingsController() {
  const [settings, setSettings] = useState<AppSettings>(() =>
    StorageService.getSettings()
  );
  const [isSyncingRate, setIsSyncingRate] = useState<boolean>(false);
  const hasAutoSyncedOnMount = useRef<boolean>(false);

  // Real-time Firestore sync
  useEffect(() => {
    const unsub = FirestoreService.subscribeToSettings(
      (remoteSettings) => {
        setSettings((prev) => ({
          ...prev,
          ...remoteSettings,
          exchangeRateMode: remoteSettings.exchangeRateMode || prev.exchangeRateMode || 'manual',
          commission: {
            ...prev.commission,
            ...(remoteSettings.commission || {}),
          },
        }));
      },
      (err) => {
        console.warn('Firestore settings fallback:', err);
      }
    );
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Update manual rate
  const updateExchangeRate = useCallback((rate: number) => {
    if (rate <= 0) return;
    setSettings((prev) => {
      const next: AppSettings = {
        ...prev,
        exchangeRateUsdToBs: rate,
        exchangeRateMode: 'manual',
      };
      StorageService.saveSettings(next);
      FirestoreService.saveSettings(next).catch((err) => {
        console.error('Error guardando tasa en Firestore', err);
      });
      return next;
    });
  }, []);

  // Sync rate from ve.dolarapi.com/v1/dolares/oficial
  const syncOfficialRate = useCallback(async (): Promise<{
    success: boolean;
    rate?: number;
    error?: string;
  }> => {
    setIsSyncingRate(true);
    try {
      const result = await DolarApiService.fetchOfficialRate();
      setSettings((prev) => {
        const next: AppSettings = {
          ...prev,
          exchangeRateUsdToBs: result.rate,
          exchangeRateMode: 'auto',
          exchangeRateLastSync: result.updatedAt,
          exchangeRateSourceDate: result.sourceDate,
        };
        StorageService.saveSettings(next);
        FirestoreService.saveSettings(next).catch((err) => {
          console.error('Error sincronizando tasa en Firestore', err);
        });
        return next;
      });
      return { success: true, rate: result.rate };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido de conexión';
      return { success: false, error: errorMsg };
    } finally {
      setIsSyncingRate(false);
    }
  }, []);

  // Switch between 'manual' and 'auto' modes
  const setExchangeRateMode = useCallback(
    async (mode: ExchangeRateMode, manualRate?: number) => {
      if (mode === 'manual') {
        setSettings((prev) => {
          const rateToUse = manualRate && manualRate > 0 ? manualRate : prev.exchangeRateUsdToBs;
          const next: AppSettings = {
            ...prev,
            exchangeRateMode: 'manual',
            exchangeRateUsdToBs: rateToUse,
          };
          StorageService.saveSettings(next);
          FirestoreService.saveSettings(next).catch((err) => {
            console.error('Error guardando modo manual en Firestore', err);
          });
          return next;
        });
      } else {
        // Auto mode: immediately sync with DolarApi
        await syncOfficialRate();
      }
    },
    [syncOfficialRate]
  );

  // Auto-sync on mount if mode is 'auto' and last sync is older than 30 minutes
  useEffect(() => {
    if (hasAutoSyncedOnMount.current) return;
    hasAutoSyncedOnMount.current = true;

    if (settings.exchangeRateMode === 'auto') {
      const lastSync = settings.exchangeRateLastSync ? new Date(settings.exchangeRateLastSync).getTime() : 0;
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      if (lastSync < thirtyMinutesAgo) {
        const timer = setTimeout(() => {
          syncOfficialRate().catch((err) => {
            console.warn('Auto-sync on mount failed:', err);
          });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [settings.exchangeRateMode, settings.exchangeRateLastSync, syncOfficialRate]);

  const updateCommission = useCallback((commission: CommissionSettings) => {
    setSettings((prev) => {
      const next = { ...prev, commission };
      StorageService.saveSettings(next);
      FirestoreService.saveSettings(next).catch((err) => {
        console.error('Error guardando comisión en Firestore', err);
      });
      return next;
    });
  }, []);

  const reloadSettings = useCallback(() => {
    setSettings(StorageService.getSettings());
  }, []);

  // Formatter for Bolívares (Moneda Principal)
  const formatBs = useCallback((amount: number): string => {
    const formatted = new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
    return `Bs. ${formatted}`;
  }, []);

  // Formatter for Dólares (Moneda Secundaria)
  const formatUsd = useCallback((amount: number): string => {
    const formatted = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `$ ${formatted}`;
  }, []);

  // Convert USD to Bs
  const usdToBs = useCallback(
    (amountUsd: number): number => {
      return Number((amountUsd * settings.exchangeRateUsdToBs).toFixed(2));
    },
    [settings.exchangeRateUsdToBs]
  );

  // Convert Bs to USD
  const bsToUsd = useCallback(
    (amountBs: number): number => {
      if (settings.exchangeRateUsdToBs <= 0) return 0;
      return Number((amountBs / settings.exchangeRateUsdToBs).toFixed(2));
    },
    [settings.exchangeRateUsdToBs]
  );

  return {
    settings,
    isSyncingRate,
    updateExchangeRate,
    setExchangeRateMode,
    syncOfficialRate,
    updateCommission,
    reloadSettings,
    formatBs,
    formatUsd,
    usdToBs,
    bsToUsd,
  };
}
