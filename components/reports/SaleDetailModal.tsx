'use client';

import React from 'react';
import { Modal } from '../ui/Modal';
import { Sale, PAYMENT_METHOD_LABELS } from '../../models/sale.model';
import { Currency } from '../../models/currency.model';
import { Printer, RotateCcw } from 'lucide-react';

interface SaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  baseCurrency: Currency;
  formatAmount: (amount: number, code?: string) => string;
  onPrint: (sale: Sale) => void;
  onCancelSale?: (saleId: string) => void;
}

export function SaleDetailModal({
  isOpen,
  onClose,
  sale,
  baseCurrency,
  formatAmount,
  onPrint,
  onCancelSale,
}: SaleDetailModalProps) {
  if (!sale) return null;

  const dateObj = new Date(sale.timestamp);
  const formattedDate = dateObj.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle de Venta"
      subtitle={`Ticket #${sale.receiptNumber} • ${formattedDate} ${formattedTime}`}
      maxWidth="md"
    >
      <div className="flex flex-col gap-4">
        {/* Customer and payment summary */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Método</span>
            <span className="font-semibold text-slate-800">{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Moneda</span>
            <span className="font-semibold text-slate-800">{sale.currencyCode} ({sale.currencySymbol})</span>
          </div>
          {sale.customerName && (
            <div className="col-span-2 pt-1 border-t border-slate-200">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Cliente</span>
              <span className="font-semibold text-slate-800">{sale.customerName} {sale.customerDoc && `(${sale.customerDoc})`}</span>
            </div>
          )}
        </div>

        {/* Itemized list */}
        <div>
          <h5 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider text-[11px]">
            Productos ({sale.items.reduce((acc, i) => acc + i.quantity, 0)} unidades)
          </h5>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
            {sale.items.map((item, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between">
                <div>
                  <h6 className="font-semibold text-slate-900">{item.name}</h6>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {item.quantity} x {formatAmount(item.unitPriceBase, baseCurrency.code)}
                  </p>
                </div>
                <span className="font-bold text-slate-900">
                  {formatAmount(item.totalBase, baseCurrency.code)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal:</span>
            <span>{formatAmount(sale.subtotalBase, baseCurrency.code)}</span>
          </div>
          {sale.discountBase > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Descuento aplicado:</span>
              <span>-{formatAmount(sale.discountBase, baseCurrency.code)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200 text-sm">
            <span>Total Cobrado:</span>
            <span>{formatAmount(sale.totalBase, baseCurrency.code)}</span>
          </div>
          {sale.currencyCode !== baseCurrency.code && (
            <div className="flex justify-between text-[11px] text-slate-600 pt-0.5">
              <span>Equivalente pagado:</span>
              <span>{sale.currencySymbol} {sale.totalInCurrency.toLocaleString('es-ES')}</span>
            </div>
          )}
          {sale.paymentMethod === 'efectivo' && (
            <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Vuelto entregado:</span>
              <span>{sale.currencySymbol} {sale.changeGivenInCurrency.toLocaleString('es-ES')}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {onCancelSale && (
            <button
              type="button"
              onClick={() => {
                onCancelSale(sale.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Anular Venta</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => onPrint(sale)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Imprimir Ticket</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
