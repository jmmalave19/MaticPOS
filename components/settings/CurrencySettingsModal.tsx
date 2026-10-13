'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Currency } from '../../models/currency.model';
import { StorageService } from '../../services/storage.service';
import { useToast } from '../ui/ToastContext';
import { Plus, Download, Upload, Check, Coins } from 'lucide-react';

interface CurrencySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencies: Currency[];
  baseCurrency: Currency;
  activeDisplayCurrency: Currency;
  onUpdateRate: (code: string, newRate: number) => void;
  onSetActiveCurrency: (code: string) => void;
  onSetBaseCurrency: (code: string) => void;
  onUpsertCurrency: (curr: Currency) => void;
  onDataRestored?: () => void;
}

export function CurrencySettingsModal({
  isOpen,
  onClose,
  currencies,
  baseCurrency,
  activeDisplayCurrency,
  onUpdateRate,
  onSetActiveCurrency,
  onSetBaseCurrency,
  onUpsertCurrency,
  onDataRestored,
}: CurrencySettingsModalProps) {
  const { success, error: toastError } = useToast();

  const [editingRates, setEditingRates] = useState<Record<string, string>>({});
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newRate, setNewRate] = useState<string>('1.0');

  // Backup handlers
  const handleExportBackup = () => {
    const json = StorageService.exportFullBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Copia_Seguridad_StockVenta_${new Date().toISOString().slice(0, 10)}.json`;
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
        onClose();
      } else {
        toastError(res.message);
      }
    };
    reader.readAsText(file);
  };

  const handleRateChange = (code: string, val: string) => {
    setEditingRates((prev) => ({ ...prev, [code]: val }));
  };

  const handleSaveRate = (code: string) => {
    const val = parseFloat(editingRates[code]);
    if (isNaN(val) || val <= 0) {
      toastError('La tasa de cambio debe ser un número mayor a cero.');
      return;
    }
    onUpdateRate(code, val);
    success(`Tasa para ${code} actualizada a ${val}.`);
  };

  const handleAddCustomCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newSymbol.trim()) {
      toastError('Código y símbolo son requeridos.');
      return;
    }
    const rateVal = parseFloat(newRate);
    if (isNaN(rateVal) || rateVal <= 0) {
      toastError('La tasa debe ser mayor a cero.');
      return;
    }

    const created: Currency = {
      code: newCode.trim().toUpperCase(),
      name: newName.trim() || newCode.trim().toUpperCase(),
      symbol: newSymbol.trim(),
      rateToBase: rateVal,
      isBase: false,
      decimalPlaces: 2,
    };

    onUpsertCurrency(created);
    setIsAddingCustom(false);
    setNewCode('');
    setNewName('');
    setNewSymbol('');
    setNewRate('1.0');
    success(`Moneda ${created.code} agregada.`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración Multimoneda y Respaldo"
      subtitle="Gestiona tasas de cambio del día y copias de seguridad"
      maxWidth="lg"
    >
      <div className="flex flex-col gap-5">
        {/* Active Display Currency Selector */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              Moneda de Visualización Principal
            </span>
            <span className="text-[11px] text-slate-500">
              Controla cómo se muestran los precios rápidos en el catálogo
            </span>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {currencies.map((curr) => (
              <button
                key={curr.code}
                type="button"
                onClick={() => onSetActiveCurrency(curr.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  curr.code === activeDisplayCurrency.code
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {curr.code} ({curr.symbol})
              </button>
            ))}
          </div>
        </div>

        {/* Currency Rates Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Tasas de Cambio (Respecto a 1 {baseCurrency.code})
            </h4>
            <button
              type="button"
              onClick={() => setIsAddingCustom(!isAddingCustom)}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 text-slate-700" />
              <span>{isAddingCustom ? 'Cancelar' : 'Nueva Moneda'}</span>
            </button>
          </div>

          {/* Form to add custom currency */}
          {isAddingCustom && (
            <form onSubmit={handleAddCustomCurrency} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-3 flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-800">Agregar Nueva Moneda</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Código (ISO)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. BRL"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Símbolo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. R$"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Nombre</label>
                  <input
                    type="text"
                    placeholder="Real Brasileño"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Tasa x 1 {baseCurrency.code}</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg"
                >
                  Guardar Moneda
                </button>
              </div>
            </form>
          )}

          {/* List of Currencies */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
            {currencies.map((curr) => {
              const currentRateStr =
                editingRates[curr.code] !== undefined
                  ? editingRates[curr.code]
                  : curr.rateToBase.toString();

              return (
                <div
                  key={curr.code}
                  className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {curr.symbol}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{curr.code}</span>
                        {curr.isBase && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                            Base
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">{curr.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:ml-auto">
                    {curr.isBase ? (
                      <span className="text-xs text-slate-400 font-medium px-3 py-1">
                        1.00 (Moneda Base)
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                          1 {baseCurrency.code} =
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={currentRateStr}
                          onChange={(e) => handleRateChange(curr.code, e.target.value)}
                          className="w-24 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-right font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRate(curr.code)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                          title="Actualizar tasa"
                        >
                          <Check className="w-3.5 h-3.5 text-slate-700" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Backup and Restore Section */}
        <div className="pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Copia de Seguridad y Restauración
          </h4>
          <p className="text-xs text-slate-500 mb-3">
            Guarda una copia de seguridad completa (productos, ventas y monedas) en tu dispositivo o restáurala en cualquier momento.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
            >
              <Download className="w-4 h-4 text-slate-700" />
              <span>Exportar Copia de Seguridad</span>
            </button>

            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer">
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
      </div>
    </Modal>
  );
}
