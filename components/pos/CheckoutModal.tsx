'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Currency } from '../../models/currency.model';
import { PaymentMethod, PAYMENT_METHOD_LABELS } from '../../models/sale.model';
import { CreditCard, Banknote, Smartphone, ArrowRightLeft, CircleDot, Fingerprint, Coins } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalBase: number;
  currencies: Currency[];
  baseCurrency: Currency;
  activeDisplayCurrency: Currency;
  formatAmount: (amount: number, code?: string) => string;
  onConfirmSale: (params: {
    paymentCurrency: Currency;
    paymentMethod: PaymentMethod;
    amountTenderedInCurrency: number;
    customerName?: string;
    customerDoc?: string;
    notes?: string;
  }) => void;
}

const paymentIcons: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
  efectivo: Banknote,
  divisa: Coins,
  tarjeta: CreditCard,
  pago_movil: Smartphone,
  biopago: Fingerprint,
  transferencia: ArrowRightLeft,
  otro: CircleDot,
};

function CheckoutFormContent({
  totalBase,
  currencies,
  baseCurrency,
  initialCurrency,
  formatAmount,
  onClose,
  onConfirmSale,
}: {
  totalBase: number;
  currencies: Currency[];
  baseCurrency: Currency;
  initialCurrency: Currency;
  formatAmount: (amount: number, code?: string) => string;
  onClose: () => void;
  onConfirmSale: (params: {
    paymentCurrency: Currency;
    paymentMethod: PaymentMethod;
    amountTenderedInCurrency: number;
    customerName?: string;
    customerDoc?: string;
    notes?: string;
  }) => void;
}) {
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(initialCurrency.code);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');

  const selectedCurrency = currencies.find((c) => c.code === selectedCurrencyCode) || baseCurrency;

  const totalInSelectedCurrency = Number(
    (totalBase * selectedCurrency.rateToBase).toFixed(selectedCurrency.decimalPlaces)
  );

  const [amountTendered, setAmountTendered] = useState<number>(() => totalInSelectedCurrency);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerDoc, setCustomerDoc] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const changeDue = Math.max(
    0,
    Number((amountTendered - totalInSelectedCurrency).toFixed(selectedCurrency.decimalPlaces))
  );
  const isCashPayment = paymentMethod === 'efectivo' || paymentMethod === 'divisa';
  const isExactOrSufficient =
    !isCashPayment || amountTendered >= totalInSelectedCurrency;

  const handleCurrencyChange = (code: string) => {
    setSelectedCurrencyCode(code);
    const curr = currencies.find((c) => c.code === code) || baseCurrency;
    const newTotal = Number((totalBase * curr.rateToBase).toFixed(curr.decimalPlaces));
    setAmountTendered(newTotal);
  };

  const handleQuickAmount = (amount: number) => {
    setAmountTendered(amount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isExactOrSufficient) return;

    onConfirmSale({
      paymentCurrency: selectedCurrency,
      paymentMethod,
      amountTenderedInCurrency: isCashPayment ? amountTendered : totalInSelectedCurrency,
      customerName,
      customerDoc,
      notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Total to pay hero banner */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center text-center">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
          Total a Cobrar
        </span>
        <span className="text-3xl font-extrabold tracking-tight mt-0.5">
          {formatAmount(totalInSelectedCurrency, selectedCurrency.code)}
        </span>
        {selectedCurrency.code !== baseCurrency.code && (
          <span className="text-xs text-slate-400 mt-1">
            Base: {formatAmount(totalBase, baseCurrency.code)} • Tasa: 1 {baseCurrency.code} = {selectedCurrency.rateToBase} {selectedCurrency.code}
          </span>
        )}
      </div>

      {/* Currency selection */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Moneda de Pago
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {currencies.map((curr) => {
            const isSelected = curr.code === selectedCurrencyCode;
            return (
              <button
                key={curr.code}
                type="button"
                onClick={() => handleCurrencyChange(curr.code)}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm">{curr.code}</span>
                <span className="text-[10px] opacity-75">{curr.symbol}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment method selection */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Método de Pago
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => {
            const isSelected = paymentMethod === method;
            const IconComp = paymentIcons[method] || CircleDot;
            return (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`p-2.5 rounded-xl text-left border flex items-center gap-2 transition-all ${
                  isSelected
                    ? 'bg-slate-100 border-slate-400 text-slate-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <IconComp className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="text-xs font-semibold truncate">
                  {PAYMENT_METHOD_LABELS[method]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cash Tendered & Change Calculation */}
      {isCashPayment && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Monto Recibido ({selectedCurrency.symbol})
              </label>
              <button
                type="button"
                onClick={() => handleQuickAmount(totalInSelectedCurrency)}
                className="text-[11px] text-slate-600 font-semibold hover:underline"
              >
                Monto Exacto
              </button>
            </div>
            <input
              type="number"
              step="any"
              min="0"
              value={amountTendered || ''}
              onChange={(e) => setAmountTendered(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 text-base font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800"
            />

            {/* Quick cash denomination chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => handleQuickAmount(totalInSelectedCurrency)}
                className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-800 transition-colors shadow-2xs"
              >
                Exacto ({formatAmount(totalInSelectedCurrency, selectedCurrency.code)})
              </button>
              {selectedCurrency.code === 'USD' ? (
                [1, 5, 10, 20, 50, 100]
                  .filter((denom) => denom >= totalInSelectedCurrency || denom === 10 || denom === 20 || denom === 50)
                  .slice(0, 4)
                  .map((denom) => (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => handleQuickAmount(denom)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
                    >
                      ${denom}
                    </button>
                  ))
              ) : (
                [
                  Math.ceil(totalInSelectedCurrency / 10) * 10,
                  Math.ceil(totalInSelectedCurrency / 50) * 50,
                  Math.ceil(totalInSelectedCurrency / 100) * 100,
                  Math.ceil(totalInSelectedCurrency / 500) * 500,
                ]
                  .filter((denom, idx, arr) => denom > totalInSelectedCurrency && arr.indexOf(denom) === idx)
                  .slice(0, 3)
                  .map((denom) => (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => handleQuickAmount(denom)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
                    >
                      {formatAmount(denom, selectedCurrency.code)}
                    </button>
                  ))
              )}
            </div>
          </div>

          {/* Change Due / Vuelto */}
          <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-600">Cambio / Vuelto:</span>
            <span
              className={`text-sm font-bold ${
                amountTendered >= totalInSelectedCurrency
                  ? 'text-emerald-700'
                  : 'text-rose-600'
              }`}
            >
              {amountTendered >= totalInSelectedCurrency
                ? formatAmount(changeDue, selectedCurrency.code)
                : `Faltan ${formatAmount(totalInSelectedCurrency - amountTendered, selectedCurrency.code)}`}
            </span>
          </div>
        </div>
      )}

      {/* Customer Info (Optional) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Cliente (Opcional)
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nombre o Razón Social"
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Documento / C.I. / RIF (Opcional)
          </label>
          <input
            type="text"
            value={customerDoc}
            onChange={(e) => setCustomerDoc(e.target.value)}
            placeholder="V-12345678"
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!isExactOrSufficient}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
        >
          Completar Venta
        </button>
      </div>
    </form>
  );
}

export function CheckoutModal({
  isOpen,
  onClose,
  totalBase,
  currencies,
  baseCurrency,
  activeDisplayCurrency,
  formatAmount,
  onConfirmSale,
}: CheckoutModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cobro de Venta"
      subtitle="Selecciona moneda de pago y forma de cobro"
      maxWidth="md"
    >
      <CheckoutFormContent
        key={`${activeDisplayCurrency.code}_${totalBase}`}
        totalBase={totalBase}
        currencies={currencies}
        baseCurrency={baseCurrency}
        initialCurrency={activeDisplayCurrency}
        formatAmount={formatAmount}
        onClose={onClose}
        onConfirmSale={onConfirmSale}
      />
    </Modal>
  );
}
