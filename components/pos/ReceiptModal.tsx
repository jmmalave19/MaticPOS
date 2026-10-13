'use client';

import React from 'react';
import { Modal } from '../ui/Modal';
import { Sale, PAYMENT_METHOD_LABELS } from '../../models/sale.model';
import { Printer, CheckCircle2 } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  baseCurrencyCode: string;
}

export function ReceiptModal({
  isOpen,
  onClose,
  sale,
  baseCurrencyCode,
}: ReceiptModalProps) {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const saleDate = new Date(sale.timestamp);
  const formattedDate = saleDate.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = saleDate.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Comprobante de Venta"
      subtitle={`Ticket #${sale.receiptNumber}`}
      maxWidth="sm"
    >
      <div className="flex flex-col gap-4">
        {/* Printable Ticket Receipt Container */}
        <div 
          id="printable-receipt"
          className="p-4 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 shadow-2xs space-y-3"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <h4 className="font-bold text-sm tracking-tight font-sans text-slate-900">
              STOCKVENTA POS
            </h4>
            <p className="text-[11px] text-slate-500 font-sans">Comprobante de Venta</p>
            <div className="text-[10px] text-slate-500 mt-1 flex justify-between px-1">
              <span>{formattedDate} {formattedTime}</span>
              <span>#{sale.receiptNumber}</span>
            </div>
            {sale.customerName && (
              <div className="text-[10px] text-slate-600 mt-1 text-left">
                <strong>Cliente:</strong> {sale.customerName}{' '}
                {sale.customerDoc && `(${sale.customerDoc})`}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between font-bold text-[10px] text-slate-500 uppercase">
              <span>Cant. / Desc.</span>
              <span>Total ({baseCurrencyCode})</span>
            </div>
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-[11px]">
                <div className="pr-2">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="block text-[9px] text-slate-400">
                    @{item.unitPriceBase.toFixed(2)}
                  </span>
                </div>
                <span className="font-semibold">{item.totalBase.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1 text-xs border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Subtotal:</span>
              <span>${sale.subtotalBase.toFixed(2)}</span>
            </div>
            {sale.discountBase > 0 && (
              <div className="flex justify-between text-emerald-600 text-[11px]">
                <span>Descuento:</span>
                <span>-${sale.discountBase.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-900 pt-1 text-xs">
              <span>Total ({baseCurrencyCode}):</span>
              <span>${sale.totalBase.toFixed(2)}</span>
            </div>

            {/* If paid in secondary currency */}
            {sale.currencyCode !== baseCurrencyCode && (
              <div className="flex justify-between font-bold text-slate-900 pt-1 text-xs bg-slate-50 p-1.5 rounded">
                <span>Total ({sale.currencyCode}):</span>
                <span>{sale.currencySymbol} {sale.totalInCurrency.toLocaleString('es-ES')}</span>
              </div>
            )}
          </div>

          {/* Payment breakdown */}
          <div className="text-[11px] space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Método:</span>
              <span className="font-semibold">{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</span>
            </div>
            {sale.paymentMethod === 'efectivo' && (
              <>
                <div className="flex justify-between">
                  <span>Pagó con:</span>
                  <span>{sale.currencySymbol} {sale.amountTenderedInCurrency.toLocaleString('es-ES')}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>Vuelto:</span>
                  <span>{sale.currencySymbol} {sale.changeGivenInCurrency.toLocaleString('es-ES')}</span>
                </div>
              </>
            )}
          </div>

          <div className="text-center pt-2 text-[10px] text-slate-400 font-sans">
            ¡Gracias por su compra!
          </div>
        </div>

        {/* Buttons */}
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
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Imprimir Ticket</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
