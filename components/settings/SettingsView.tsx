'use client';

import React, { useState, useEffect } from 'react';
import { AppSettings, CommissionSettings, ExchangeRateMode } from '../../models/settings.model';
import { StorageService } from '../../services/storage.service';
import { useToast } from '../ui/ToastContext';
import { 
  Percent, 
  Coins, 
  Download, 
  Upload, 
  Check,
  RefreshCw
} from 'lucide-react';
import { PWAInstallButton } from '../ui/PWAInstallButton';

interface SettingsViewProps {
  settings: AppSettings;
  isSyncingRate?: boolean;
  onUpdateExchangeRate: (rate: number) => void;
  onSetExchangeRateMode?: (mode: ExchangeRateMode, manualRate?: number) => Promise<void> | void;
  onSyncOfficialRate?: () => Promise<{ success: boolean; rate?: number; error?: string }>;
  onUpdateCommission: (commission: CommissionSettings) => void;
  onDataRestored?: () => void;
  formatBs: (amount: number) => string;
}

function formatSyncDate(isoString?: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function SettingsView({
  settings,
  isSyncingRate = false,
  onUpdateExchangeRate,
  onSetExchangeRateMode,
  onSyncOfficialRate,
  onUpdateCommission,
  onDataRestored,
  formatBs,
}: SettingsViewProps) {
  const { success, error: toastError } = useToast();

  const [rateMode, setRateMode] = useState<ExchangeRateMode>(settings.exchangeRateMode || 'manual');
  const [rateInput, setRateInput] = useState<string>(settings.exchangeRateUsdToBs.toString());

  // Sincronizar estado local si la tasa externa cambia (siguiendo el patrón oficial de React)
  const [prevProps, setPrevProps] = useState({
    rate: settings.exchangeRateUsdToBs,
    mode: settings.exchangeRateMode,
  });

  if (
    prevProps.rate !== settings.exchangeRateUsdToBs ||
    prevProps.mode !== settings.exchangeRateMode
  ) {
    setPrevProps({
      rate: settings.exchangeRateUsdToBs,
      mode: settings.exchangeRateMode,
    });
    setRateInput(settings.exchangeRateUsdToBs.toString());
    setRateMode(settings.exchangeRateMode || 'manual');
  }

  // Commission local state
  const [commissionEnabled, setCommissionEnabled] = useState<boolean>(settings.commission.enabled);
  const [commissionRate, setCommissionRate] = useState<string>(settings.commission.ratePercent.toString());
  const [commissionTarget, setCommissionTarget] = useState<'total_sales' | 'gross_profit'>(settings.commission.target);

  // Manejador del cambio de modalidad (Manual / Automática)
  const handleModeChange = async (newMode: ExchangeRateMode) => {
    setRateMode(newMode);
    if (onSetExchangeRateMode) {
      if (newMode === 'manual') {
        const parsed = parseFloat(rateInput);
        await onSetExchangeRateMode('manual', !isNaN(parsed) && parsed > 0 ? parsed : undefined);
      } else {
        await onSetExchangeRateMode('auto');
        if (onSyncOfficialRate) {
          const res = await onSyncOfficialRate();
          if (res.success && res.rate) {
            success(`Tasa oficial sincronizada: 1 USD = ${formatBs(res.rate)}.`);
          } else if (res.error) {
            toastError(res.error);
          }
        }
      }
    }
  };

  // Guardar tasa en modo manual
  const handleSaveManualRate = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(rateInput);
    if (isNaN(rate) || rate <= 0) {
      toastError('La tasa de cambio debe ser un número positivo.');
      return;
    }
    onUpdateExchangeRate(rate);
    success(`Tasa del día actualizada: 1 USD = ${formatBs(rate)}.`);
  };

  // Sincronizar manualmente con la API en modo automático
  const handleTriggerSync = async () => {
    if (!onSyncOfficialRate) return;
    const res = await onSyncOfficialRate();
    if (res.success && res.rate) {
      success(`Tasa oficial actualizada: 1 USD = ${formatBs(res.rate)}.`);
    } else {
      toastError(res.error || 'No se pudo actualizar la tasa oficial.');
    }
  };

  const handleSaveCommission = (e: React.FormEvent) => {
    e.preventDefault();
    const rateVal = parseFloat(commissionRate) || 0;
    if (rateVal < 0 || rateVal > 100) {
      toastError('El porcentaje de comisión debe estar entre 0 y 100%.');
      return;
    }

    const updated: CommissionSettings = {
      enabled: commissionEnabled,
      ratePercent: rateVal,
      target: commissionTarget,
    };
    onUpdateCommission(updated);
    success('Configuración de comisiones guardada.');
  };

  // Backup handlers
  const handleExportBackup = () => {
    const json = StorageService.exportFullBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Respaldo_StockVenta_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success('Copia de seguridad descargada.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.importFullBackup(content);
      if (res.success) {
        success(res.message);
        if (onDataRestored) onDataRestored();
      } else {
        toastError(res.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto pb-28 pt-2 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Ajustes del Sistema
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configuración de tasas de cambio, comisiones y respaldo de información
        </p>
      </div>

      {/* 1. Tasa de Cambio del Día (USD a Bs) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">
            Tasa de Cambio (USD a Bs)
          </h2>
        </div>

        <p className="text-xs text-slate-500">
          La moneda base del sistema es el Bolívar (Bs.). Selecciona cómo deseas fijar la tasa de cambio para calcular los precios del catálogo y del punto de venta.
        </p>

        {/* Selector de Modalidad: Manual o Automática */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => handleModeChange('manual')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
              rateMode === 'manual'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('auto')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
              rateMode === 'auto'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Automática (Dólar Oficial)
          </button>
        </div>

        {/* Modalidad 1: Manual */}
        {rateMode === 'manual' ? (
          <form onSubmit={handleSaveManualRate} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                1 USD =
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder="0.00"
                className="w-full pl-16 pr-12 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 font-bold text-slate-900"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                Bs.
              </span>
            </div>

            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 shrink-0"
            >
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Guardar Tasa</span>
            </button>
          </form>
        ) : (
          /* Modalidad 2: Automática con DolarApi (en una sola línea) */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="font-bold text-slate-900">
                1 USD = {formatBs(settings.exchangeRateUsdToBs)}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">Dólar Oficial (BCV)</span>
              {settings.exchangeRateLastSync && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">
                    Sincronizado: {formatSyncDate(settings.exchangeRateLastSync)}
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={isSyncingRate}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${isSyncingRate ? 'animate-spin' : ''}`} />
              <span>{isSyncingRate ? 'Consultando...' : 'Actualizar ahora'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Configuración de Comisión */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Cálculo de Comisión
            </h2>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-700">
              {commissionEnabled ? 'Activada' : 'Desactivada'}
            </span>
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                role="switch"
                aria-checked={commissionEnabled}
                checked={commissionEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setCommissionEnabled(checked);
                  if (!checked) {
                    const rateVal = parseFloat(commissionRate) || 0;
                    onUpdateCommission({
                      enabled: false,
                      ratePercent: rateVal,
                      target: commissionTarget,
                    });
                    success('Cálculo de comisión desactivado.');
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900 transition-colors" />
            </div>
          </label>
        </div>

        <p className="text-xs text-slate-500">
          Permite calcular automáticamente la comisión correspondiente en los reportes diarios y cierre de jornada.
        </p>

        {commissionEnabled && (
          <form onSubmit={handleSaveCommission} className="space-y-4 pt-1 border-t border-slate-100">
            {/* Porcentaje */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Porcentaje de Comisión (%)
              </label>
              <div className="relative w-40">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  required
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 font-bold text-slate-900"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  %
                </span>
              </div>
            </div>

            {/* Base de Aplicación: Ventas Totales vs Ganancias */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Base de Aplicación de la Comisión:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    commissionTarget === 'total_sales'
                      ? 'border-slate-800 bg-slate-50/80 shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="commissionTarget"
                    value="total_sales"
                    checked={commissionTarget === 'total_sales'}
                    onChange={() => setCommissionTarget('total_sales')}
                    className="mt-0.5 text-slate-900 focus:ring-slate-800"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Total en Ventas Brutas
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Aplica el {commissionRate}% sobre el monto total facturado en el día.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    commissionTarget === 'gross_profit'
                      ? 'border-slate-800 bg-slate-50/80 shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="commissionTarget"
                    value="gross_profit"
                    checked={commissionTarget === 'gross_profit'}
                    onChange={() => setCommissionTarget('gross_profit')}
                    className="mt-0.5 text-slate-900 focus:ring-slate-800"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Ganancias de Ventas (Utilidad)
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Aplica el {commissionRate}% sobre el margen de ganancia (Venta menos Costo).
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
              >
                Guardar Comisión
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 3. Respaldo y Restauración de Datos */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900">
          Copia de Seguridad y Restauración
        </h2>
        <p className="text-xs text-slate-500">
          Descarga un archivo JSON con todos tus productos, ventas y configuraciones, o restáuralo en cualquier momento.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-700" />
            <span>Exportar Copia de Seguridad</span>
          </button>

          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shadow-2xs cursor-pointer">
            <Upload className="w-4 h-4 text-slate-700" />
            <span>Restaurar Copia de Seguridad</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 4. Aplicación Web Progresiva (PWA) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900">
          Instalación de la App (PWA)
        </h2>
        <p className="text-xs text-slate-500">
          Instala StockVenta en tu dispositivo móvil o computadora para abrirla como una aplicación nativa en pantalla completa y acceder a ella rápidamente desde tu pantalla de inicio.
        </p>

        <div className="pt-1">
          <PWAInstallButton variant="settings" />
        </div>
      </div>
    </div>
  );
}
