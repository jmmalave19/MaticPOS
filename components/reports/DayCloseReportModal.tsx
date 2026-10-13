'use client';

import React from 'react';
import { Modal } from '../ui/Modal';
import { WorkDaySession } from '../../models/session.model';
import { Printer } from 'lucide-react';

interface DayCloseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: WorkDaySession | null;
  formatBs: (amount: number) => string;
  formatUsd: (amount: number) => string;
}

export function DayCloseReportModal({
  isOpen,
  onClose,
  session,
  formatBs,
  formatUsd,
}: DayCloseReportModalProps) {
  if (!session) return null;

  const handlePrint = () => {
    window.print();
  };

  const openedDate = new Date(session.openedAt);
  const closedDate = session.closedAt ? new Date(session.closedAt) : new Date();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cierre de Jornada y Cuadre de Caja"
      subtitle={`Fecha: ${session.dateString}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Printable Z-Report Container */}
        <div
          id="printable-closing-report"
          className="p-5 bg-white border border-slate-200 rounded-2xl font-mono text-xs text-slate-800 shadow-2xs space-y-4"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <h3 className="font-bold text-base tracking-tight font-sans text-slate-900">
              REPORTE DE CIERRE DE CAJA
            </h3>
            <p className="text-xs font-sans text-slate-500 font-semibold uppercase tracking-wider">
              Control y Cuadre de Jornada
            </p>
            <div className="text-[11px] text-slate-500 mt-1 flex justify-between px-1">
              <span>Apertura: {openedDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
              <span>Cierre: {closedDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* 1. Fondo Inicial */}
          <div className="p-3 bg-slate-50 rounded-xl space-y-1">
            <span className="font-bold text-[10px] text-slate-400 uppercase block tracking-wider font-sans">
              1. Base de Caja Inicial
            </span>
            <div className="flex justify-between">
              <span>Fondo Inicial en Bs:</span>
              <strong className="text-slate-900">{formatBs(session.initialCashBs)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Fondo Inicial en $:</span>
              <strong className="text-slate-900">{formatUsd(session.initialCashUsd)}</strong>
            </div>
          </div>

          {/* 2. Total Ventas Realizadas */}
          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
            <span className="font-bold text-[10px] text-slate-400 uppercase block tracking-wider font-sans">
              2. Resumen de Ventas ({session.totalSalesCount || 0} tickets)
            </span>
            <div className="flex justify-between text-sm font-bold text-slate-900">
              <span>Total Ventas (Bs.):</span>
              <span>{formatBs(session.totalSalesBs || 0)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Total Ventas (USD $):</span>
              <span>{formatUsd(session.totalSalesUsd || 0)}</span>
            </div>
          </div>

          {/* 3. Desglose por método de pago */}
          {session.breakdown && (
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-[11px]">
              <span className="font-bold text-[10px] text-slate-400 uppercase block tracking-wider font-sans">
                3. Cobros por Método de Pago
              </span>
              <div className="flex justify-between">
                <span>Efectivo (Bs.):</span>
                <span className="font-semibold">{formatBs(session.breakdown.efectivoBs)}</span>
              </div>
              <div className="flex justify-between">
                <span>Divisas ($):</span>
                <span className="font-semibold">{formatUsd(session.breakdown.divisaUsd || session.breakdown.efectivoUsd || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tarjeta / Punto de Venta:</span>
                <span className="font-semibold">{formatBs(session.breakdown.tarjetaBs)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pago Móvil:</span>
                <span className="font-semibold">{formatBs(session.breakdown.pagoMovilBs)}</span>
              </div>
              <div className="flex justify-between">
                <span>BioPago:</span>
                <span className="font-semibold">{formatBs(session.breakdown.biopagoBs || 0)}</span>
              </div>
              {session.breakdown.transferenciaBs > 0 && (
                <div className="flex justify-between">
                  <span>Transferencia:</span>
                  <span className="font-semibold">{formatBs(session.breakdown.transferenciaBs)}</span>
                </div>
              )}
            </div>
          )}

          {/* 4. Efectivo Esperado en Caja (Fondo Inicial + Ventas Efectivo) */}
          <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1">
            <span className="font-bold text-[10px] text-slate-400 uppercase block tracking-wider font-sans">
              4. Efectivo Físico Esperado en Caja
            </span>
            <div className="flex justify-between text-xs">
              <span>Efectivo Esperado (Bs.):</span>
              <strong className="text-white text-sm">{formatBs(session.expectedCashBs || 0)}</strong>
            </div>
            <div className="flex justify-between text-xs">
              <span>Efectivo Esperado ($):</span>
              <strong className="text-white text-sm">{formatUsd(session.expectedCashUsd || 0)}</strong>
            </div>
          </div>

          {/* 5. Ganancia y Comisión */}
          <div className="space-y-1 text-xs pt-1 border-t border-slate-200">
            <div className="flex justify-between text-slate-600">
              <span>Ganancia Bruta (Utilidad):</span>
              <span className="font-semibold">{formatBs(session.grossProfitBs || 0)}</span>
            </div>
            {session.commissionBs !== undefined && session.commissionBs > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg">
                <span>Comisión Calculada:</span>
                <span>{formatBs(session.commissionBs)} ({formatUsd(session.commissionUsd || 0)})</span>
              </div>
            )}
          </div>

          {session.closingNotes && (
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-sans">
              <strong>Observaciones:</strong> {session.closingNotes}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Imprimir Cierre</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
