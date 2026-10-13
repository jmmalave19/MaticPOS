'use client';

import React, { useState } from 'react';
import { DailyReportSummary } from '../../models/report.model';
import { Sale, PaymentMethod, PAYMENT_METHOD_LABELS } from '../../models/sale.model';
import { StockAdjustment } from '../../models/product.model';
import { WorkDaySession } from '../../models/session.model';
import { SaleDetailModal } from './SaleDetailModal';
import { ReceiptModal } from '../pos/ReceiptModal';
import { DayOpenModal } from './DayOpenModal';
import { DayCloseReportModal } from './DayCloseReportModal';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useToast } from '../ui/ToastContext';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Eye,
  Printer,
  Sun,
  Moon,
  Percent,
  Clock,
  CheckCircle2,
  Banknote,
  Coins,
  CreditCard,
  Smartphone,
  Fingerprint,
} from 'lucide-react';

interface DailyReportsViewProps {
  dailySummary: DailyReportSummary;
  dailyAdjustments?: StockAdjustment[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  formatBs: (amount: number) => string;
  formatUsd: (amount: number) => string;
  onCancelSale: (saleId: string) => void;
  isDayOpen: boolean;
  activeSession: WorkDaySession | null;
  sessions: WorkDaySession[];
  onOpenDay: (initialBs: number, initialUsd: number) => { success: boolean; session?: WorkDaySession; error?: string };
  onCloseDay: (params: { sales: Sale[]; closingNotes?: string }) => { success: boolean; closedSession?: WorkDaySession; error?: string };
}

export function DailyReportsView({
  dailySummary,
  dailyAdjustments,
  selectedDate,
  onSelectDate,
  formatBs,
  formatUsd,
  onCancelSale,
  isDayOpen,
  activeSession,
  sessions,
  onOpenDay,
  onCloseDay,
}: DailyReportsViewProps) {
  const { success, error: toastError } = useToast();

  const [isDayOpenModalVisible, setIsDayOpenModalVisible] = useState(false);
  const [isDayCloseConfirmVisible, setIsDayCloseConfirmVisible] = useState(false);
  const [closingNotes, setClosingNotes] = useState('');
  const [closedSessionReport, setClosedSessionReport] = useState<WorkDaySession | null>(null);

  const [selectedSaleForDetail, setSelectedSaleForDetail] = useState<Sale | null>(null);
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);
  const [saleToCancelId, setSaleToCancelId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = selectedDate === todayStr;

  const handleConfirmOpenDay = (initialBs: number, initialUsd: number) => {
    const res = onOpenDay(initialBs, initialUsd);
    if (res.success) {
      success('Jornada iniciada con éxito. Ya puedes registrar ventas y generar reportes.');
    } else if (res.error) {
      toastError(res.error);
    }
  };

  const handleConfirmCloseDay = () => {
    const res = onCloseDay({
      sales: dailySummary.sales,
      closingNotes,
    });
    setIsDayCloseConfirmVisible(false);
    setClosingNotes('');

    if (res.success && res.closedSession) {
      success('Jornada finalizada y reporte de cierre generado.');
      setClosedSessionReport(res.closedSession);
    } else if (res.error) {
      toastError(res.error);
    }
  };

  const handleExportCSV = () => {
    if (dailySummary.sales.length === 0) return;

    const headers = ['Ticket', 'Fecha_Hora', 'Cliente', 'Metodo_Pago', 'Total_Bs', 'Total_USD'];
    const rows = dailySummary.sales.map((s) => [
      s.receiptNumber,
      `"${s.timestamp}"`,
      `"${s.customerName || 'Consumidor Final'}"`,
      PAYMENT_METHOD_LABELS[s.paymentMethod],
      s.totalBs.toFixed(2),
      s.totalUsd.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Ventas_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success(`Reporte del ${selectedDate} descargado en CSV.`);
  };

  // Totales consolidados por método de pago para la tarjeta solicitada:
  // Efectivo, Divisa, Tarjeta, Pago Móvil, BioPago
  const paymentTotalsMap = React.useMemo(() => {
    const map: Record<string, { count: number; totalBs: number; totalUsd: number }> = {};
    for (const item of dailySummary.paymentMethodBreakdown) {
      map[item.method] = {
        count: item.count,
        totalBs: item.totalBs,
        totalUsd: item.totalUsd,
      };
    }
    return map;
  }, [dailySummary.paymentMethodBreakdown]);

  const adjustmentsList = React.useMemo(() => {
    return dailyAdjustments || dailySummary.adjustments || [];
  }, [dailyAdjustments, dailySummary.adjustments]);

  const adjustmentsSummary = React.useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const adj of adjustmentsList) {
      if (adj.type === 'in') {
        totalIn += adj.quantity;
      } else {
        totalOut += adj.quantity;
      }
    }
    return {
      totalCount: adjustmentsList.length,
      totalIn,
      totalOut,
    };
  }, [adjustmentsList]);

  const paymentMethodConfig: {
    method: PaymentMethod;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
  }[] = [
    {
      method: 'efectivo',
      label: 'Efectivo',
      icon: Banknote,
      badgeClass: 'bg-emerald-100 text-emerald-800',
    },
    {
      method: 'divisa',
      label: 'Divisa',
      icon: Coins,
      badgeClass: 'bg-blue-100 text-blue-800',
    },
    {
      method: 'tarjeta',
      label: 'Tarjeta / Punto',
      icon: CreditCard,
      badgeClass: 'bg-indigo-100 text-indigo-800',
    },
    {
      method: 'pago_movil',
      label: 'Pago Móvil',
      icon: Smartphone,
      badgeClass: 'bg-amber-100 text-amber-800',
    },
    {
      method: 'biopago',
      label: 'BioPago',
      icon: Fingerprint,
      badgeClass: 'bg-teal-100 text-teal-800',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-28 pt-2 space-y-4">
      {/* 1. Day / Shift Action Banner (Iniciar Día / Finalizar Día) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDayOpen
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isDayOpen ? (
                <Sun className="w-5 h-5 text-emerald-700" />
              ) : (
                <Moon className="w-5 h-5 text-amber-700" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  {isDayOpen ? 'Jornada en Curso (Día Iniciado)' : 'Jornada Cerrada'}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isDayOpen
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isDayOpen ? 'ABIERTO' : 'CERRADO'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isDayOpen && activeSession
                  ? `Iniciado a las ${new Date(activeSession.openedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} • Base: ${formatBs(activeSession.initialCashBs)} (${formatUsd(activeSession.initialCashUsd)})`
                  : 'Debes iniciar el día para generar el reporte de ventas del día.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isDayOpen ? (
              <button
                type="button"
                onClick={() => setIsDayOpenModalVisible(true)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-2"
              >
                <Sun className="w-4 h-4 text-white" />
                <span>Iniciar Día</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsDayCloseConfirmVisible(true)}
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-2"
              >
                <Moon className="w-4 h-4 text-white" />
                <span>Finalizar Día (Generar Reporte)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Date Filter & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Reporte de Ventas
          </h1>
          <p className="text-xs text-slate-500">
            {isDayOpen ? 'Visualizando ventas en tiempo real de la jornada' : 'Histórico y registros del día seleccionado'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onSelectDate(todayStr)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isToday ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              aria-label="Seleccionar fecha"
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none"
            />
          </div>

          {dailySummary.sales.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Ingresos (Bs Primary & USD Secondary) */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Ingresos Totales
            </span>
            <DollarSign className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight block">
              {formatBs(dailySummary.totalRevenueBs)}
            </span>
            <span className="text-[11px] font-bold text-slate-500 mt-0.5 block">
              {formatUsd(dailySummary.totalRevenueUsd)}
            </span>
          </div>
        </div>

        {/* Total Tickets */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tickets Emitidos
            </span>
            <Receipt className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight block">
              {dailySummary.totalSalesCount}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {dailySummary.totalItemsSold} artículos vendidos
            </span>
          </div>
        </div>

        {/* Ganancia Bruta (Utilidad) */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Ganancia Bruta
            </span>
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight block">
              {formatBs(dailySummary.grossProfitBs)}
            </span>
            <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">
              Margen: {dailySummary.profitMarginPercent}%
            </span>
          </div>
        </div>

        {/* Comisión */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Comisión {dailySummary.commissionEnabled ? `(${dailySummary.commissionPercent}%)` : ''}
            </span>
            <Percent className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            {dailySummary.commissionEnabled ? (
              <>
                <span className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight block">
                  {formatBs(dailySummary.commissionBs)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Sobre {dailySummary.commissionTarget === 'total_sales' ? 'Ventas Totales' : 'Ganancias'}
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-slate-400 block pt-1">
                  Sin comisión
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Actívala en Ajustes
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tarjeta: Totales por Medio de Pago (Efectivo, Divisa, Tarjeta, Pago Móvil, BioPago) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Totales por Medio de Pago
            </h3>
            <p className="text-xs text-slate-500">
              Desglose consolidado de cobros según el método utilizado
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {dailySummary.totalSalesCount} {dailySummary.totalSalesCount === 1 ? 'operación' : 'operaciones'}
          </span>
        </div>

        {/* Grid de 5 Medios de Pago principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {paymentMethodConfig.map((item) => {
            const data = paymentTotalsMap[item.method] || { count: 0, totalBs: 0, totalUsd: 0 };
            const Icon = item.icon;
            const percentage =
              dailySummary.totalRevenueBs > 0
                ? Number(((data.totalBs / dailySummary.totalRevenueBs) * 100).toFixed(1))
                : 0;

            return (
              <div
                key={item.method}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.badgeClass}`}>
                      <Icon className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {item.label}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {data.count} {data.count === 1 ? 'cobro' : 'cobros'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                    {percentage}%
                  </span>
                </div>

                <div className="pt-1 border-t border-slate-200/60 flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-black text-slate-900 block">
                      {formatBs(data.totalBs)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 block">
                      {formatUsd(data.totalUsd)}
                    </span>
                  </div>
                  {data.count === 0 && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      Sin cobros
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Transferencia u otros si hubiesen existido */}
        {((paymentTotalsMap['transferencia']?.count || 0) > 0 || (paymentTotalsMap['otro']?.count || 0) > 0) && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-600">
            {(paymentTotalsMap['transferencia']?.count || 0) > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Transferencias:</span>
                <span className="font-bold text-slate-900">
                  {formatBs(paymentTotalsMap['transferencia'].totalBs)} ({formatUsd(paymentTotalsMap['transferencia'].totalUsd)})
                </span>
                <span className="text-[10px] text-slate-400">({paymentTotalsMap['transferencia'].count})</span>
              </div>
            )}
            {(paymentTotalsMap['otro']?.count || 0) > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Otros Métodos:</span>
                <span className="font-bold text-slate-900">
                  {formatBs(paymentTotalsMap['otro'].totalBs)} ({formatUsd(paymentTotalsMap['otro'].totalUsd)})
                </span>
                <span className="text-[10px] text-slate-400">({paymentTotalsMap['otro'].count})</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tarjeta: Ajustes de Inventario del Día */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Ajustes de Inventario del Día
            </h3>
            <p className="text-xs text-slate-500">
              Movimientos de entrada y salida registrados en la fecha
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-lg">
              +{adjustmentsSummary.totalIn} entradas
            </span>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-lg">
              -{adjustmentsSummary.totalOut} salidas
            </span>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
              {adjustmentsList.length} {adjustmentsList.length === 1 ? 'ajuste' : 'ajustes'}
            </span>
          </div>
        </div>

        {adjustmentsList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            No se registraron ajustes de inventario para esta fecha.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <th className="pb-2 pl-1">Hora</th>
                  <th className="pb-2">Producto</th>
                  <th className="pb-2">Tipo</th>
                  <th className="pb-2">Motivo</th>
                  <th className="pb-2 text-right">Cantidad</th>
                  <th className="pb-2 text-right pr-1">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustmentsList.map((adj) => {
                  const time = new Date(adj.timestamp).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const isEntry = adj.type === 'in';

                  return (
                    <tr key={adj.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 pl-1 font-medium text-slate-500 whitespace-nowrap">
                        {time}
                      </td>
                      <td className="py-2.5 pr-2">
                        <span className="font-bold text-slate-800 block truncate max-w-[200px] sm:max-w-none">
                          {adj.productName}
                        </span>
                        {adj.description && (
                          <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                            {adj.description}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isEntry
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                              : 'bg-rose-50 text-rose-800 border border-rose-200/60'
                          }`}
                        >
                          {isEntry ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-700">
                          {adj.reason ? adj.reason.replace(/\(\+\)\s*|\(-\)\s*/g, '').trim() : (isEntry ? 'Entrada' : 'Salida')}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-black whitespace-nowrap">
                        <span className={isEntry ? 'text-emerald-700' : 'text-rose-700'}>
                          {isEntry ? `+${adj.quantity}` : `-${adj.quantity}`}
                        </span>
                      </td>
                      <td className="py-2.5 pr-1 text-right text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {adj.previousStock} → <strong className="text-slate-800">{adj.newStock}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial de Cierres de Jornada Pasados */}
      {(() => {
        const closedSessions = sessions.filter((s) => s.status === 'closed');
        const uniqueClosedSessions = closedSessions.filter(
          (s, idx, self) => idx === self.findIndex((t) => t.id === s.id)
        );
        if (uniqueClosedSessions.length === 0) return null;

        return (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Historial de Jornadas Finalizadas ({uniqueClosedSessions.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {uniqueClosedSessions.slice(0, 5).map((sess, idx) => (
                <div key={sess.id || `session-${idx}`} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-bold text-slate-900">
                        Jornada {sess.dateString}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                        {sess.totalSalesCount || 0} ventas
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Total: {formatBs(sess.totalSalesBs || 0)} ({formatUsd(sess.totalSalesUsd || 0)})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setClosedSessionReport(sess)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-700" />
                    <span>Ver Cierre</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Iniciar Día Modal */}
      <DayOpenModal
        isOpen={isDayOpenModalVisible}
        onClose={() => setIsDayOpenModalVisible(false)}
        onConfirmOpen={handleConfirmOpenDay}
        formatBs={formatBs}
      />

      {/* Finalizar Día Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDayCloseConfirmVisible}
        onClose={() => setIsDayCloseConfirmVisible(false)}
        onConfirm={handleConfirmCloseDay}
        title="Finalizar Día de Trabajo"
        message="¿Estás seguro de que deseas cerrar la jornada actual? Se generará el reporte oficial de cierre y cuadre de caja con todas las ventas del día."
        confirmText="Finalizar Jornada"
      />

      {/* Official Z-Report Closing Modal */}
      <DayCloseReportModal
        isOpen={!!closedSessionReport}
        onClose={() => setClosedSessionReport(null)}
        session={closedSessionReport}
        formatBs={formatBs}
        formatUsd={formatUsd}
      />

      {/* Sale Detail Modal */}
      <SaleDetailModal
        isOpen={!!selectedSaleForDetail}
        onClose={() => setSelectedSaleForDetail(null)}
        sale={selectedSaleForDetail}
        baseCurrency={{ code: 'VES', symbol: 'Bs.', name: 'Bolívares', rateToBase: 1, isBase: true, decimalPlaces: 2 }}
        formatAmount={(amt) => formatBs(amt)}
        onPrint={(s) => {
          setSelectedSaleForDetail(null);
          setSelectedSaleForPrint(s);
        }}
        onCancelSale={(saleId) => setSaleToCancelId(saleId)}
      />

      {/* Print receipt modal */}
      <ReceiptModal
        isOpen={!!selectedSaleForPrint}
        onClose={() => setSelectedSaleForPrint(null)}
        sale={selectedSaleForPrint}
        baseCurrencyCode="Bs."
      />

      {/* Cancel Sale confirmation modal */}
      <ConfirmationModal
        isOpen={!!saleToCancelId}
        onClose={() => setSaleToCancelId(null)}
        onConfirm={() => {
          if (saleToCancelId) {
            onCancelSale(saleToCancelId);
            setSaleToCancelId(null);
            success('Venta anulada.');
          }
        }}
        title="Anular Venta"
        message="¿Estás seguro de que deseas anular esta venta? El registro será eliminado del reporte del día."
        confirmText="Anular Venta"
        isDestructive
      />
    </div>
  );
}
