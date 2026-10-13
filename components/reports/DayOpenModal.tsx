'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Sun } from 'lucide-react';

interface DayOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmOpen: (initialCashBs: number, initialCashUsd: number) => void;
  formatBs: (amount: number) => string;
}

export function DayOpenModal({
  isOpen,
  onClose,
  onConfirmOpen,
  formatBs,
}: DayOpenModalProps) {
  const [initialBs, setInitialBs] = useState<string>('0');
  const [initialUsd, setInitialUsd] = useState<string>('0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bs = Math.max(0, parseFloat(initialBs) || 0);
    const usd = Math.max(0, parseFloat(initialUsd) || 0);
    onConfirmOpen(bs, usd);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Iniciar Día de Trabajo"
      subtitle="Apertura de jornada y registro de base inicial de caja"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">
            Al iniciar el día:
          </p>
          <p>
            Se habilita el registro de ventas para el reporte y se fija el punto de partida del cuadre de caja diario.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Fondo Inicial en Bolívares (Bs.)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              Bs.
            </span>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={initialBs}
              onChange={(e) => setInitialBs(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 font-bold text-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Fondo Inicial en Dólares ($ USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              $
            </span>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={initialUsd}
              onChange={(e) => setInitialUsd(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 font-bold text-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <Sun className="w-3.5 h-3.5 text-white" />
            <span>Abrir Jornada</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
