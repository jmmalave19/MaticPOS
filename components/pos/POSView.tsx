'use client';

import React, { useState } from 'react';
import { Product } from '../../models/product.model';
import { Currency } from '../../models/currency.model';
import { CartItem, PaymentMethod, Sale } from '../../models/sale.model';
import { CheckoutModal } from './CheckoutModal';
import { ReceiptModal } from './ReceiptModal';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useToast } from '../ui/ToastContext';
import {
  Barcode,
  Plus,
  Minus,
  Trash2,
  Percent,
  Sun,
  AlertCircle,
  CreditCard,
  RotateCcw
} from 'lucide-react';

interface POSViewProps {
  products: Product[];
  categories: string[];
  cart: CartItem[];
  subtotalBs: number;
  discountPercent: number;
  discountAmountBs: number;
  totalBs: number;
  totalUsd: number;
  totalItemsCount: number;
  onAddToCart: (product: Product, quantity?: number) => { success: boolean; message?: string };
  onUpdateQuantity: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onSetDiscountPercent: (percent: number) => void;
  onCompleteSale: (params: {
    paymentCurrency: Currency;
    paymentMethod: PaymentMethod;
    amountTenderedInCurrency: number;
    customerName?: string;
    customerDoc?: string;
    notes?: string;
  }) => { success: boolean; sale?: Sale; error?: string };
  lastCompletedSale: Sale | null;
  onCloseReceipt: () => void;
  baseCurrency: Currency;
  activeDisplayCurrency: Currency;
  currencies: Currency[];
  formatAmount: (amount: number, code?: string) => string;
  convertFromBase: (amount: number, code?: string) => number;
  formatBs: (amount: number) => string;
  formatUsd: (amount: number) => string;
  onNavigateToInventory: () => void;
  onNavigateToAddProduct: () => void;
  isDayOpen: boolean;
  onStartDayClick: () => void;
  exchangeRateUsdToBs: number;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

export function POSView({
  products,
  cart,
  subtotalBs,
  discountPercent,
  discountAmountBs,
  totalBs,
  totalUsd,
  totalItemsCount,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onSetDiscountPercent,
  onCompleteSale,
  lastCompletedSale,
  onCloseReceipt,
  baseCurrency,
  activeDisplayCurrency,
  currencies,
  formatAmount,
  formatBs,
  formatUsd,
  isDayOpen,
  onStartDayClick,
  exchangeRateUsdToBs,
}: POSViewProps) {
  const { error: toastError, info } = useToast();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isDiscountPromptOpen, setIsDiscountPromptOpen] = useState(false);
  const [customDiscount, setCustomDiscount] = useState<number>(discountPercent);

  const handleApplyDiscount = () => {
    const safeDisc = Math.min(100, Math.max(0, customDiscount));
    onSetDiscountPercent(safeDisc);
    setIsDiscountPromptOpen(false);
    if (safeDisc > 0) {
      info(`Descuento de ${safeDisc}% aplicado.`);
    } else {
      info('Descuento removido.');
    }
  };

  return (
    <div className={`flex flex-col gap-4 min-h-[calc(100vh-120px)] max-w-5xl mx-auto ${cart.length > 0 ? 'pb-48 sm:pb-44' : 'pb-24'}`}>
      {/* Alerta de jornada si el día no está iniciado */}
      {!isDayOpen && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-amber-900 block leading-tight">
                Jornada de hoy no iniciada
              </span>
              <span className="text-[11px] text-amber-700 block mt-0.5">
                Inicia el día para registrar las ventas en el reporte diario.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartDayClick}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sun className="w-3.5 h-3.5 text-white" />
            <span>Iniciar Día</span>
          </button>
        </div>
      )}

      {/* Contenedor Principal: Lista minimalista de productos en la venta */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
        {/* Encabezado limpio de la lista de productos seleccionados */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-900 inline-block" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              Productos en Venta ({totalItemsCount})
            </h2>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearConfirmOpen(true)}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Vaciar Venta</span>
            </button>
          )}
        </div>

        {/* Contenido: Lista minimalista de productos */}
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center text-slate-400 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <Barcode className="w-7 h-7 text-slate-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Caja lista para vender
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Escanea un código de barras con el lector superior o ingresa el código/nombre arriba para agregar productos a esta venta.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-y-auto">
            {cart.map((item) => {
              const itemBs = item.product.priceBs || item.product.sellingPrice;
              const totalItemBs = itemBs * item.quantity;
              const itemUsd = item.product.priceUsd || (exchangeRateUsdToBs > 0 ? itemBs / exchangeRateUsdToBs : 0);
              const totalItemUsd = itemUsd * item.quantity;
              const code = item.product.barcode || (item.product as { code?: string }).code;

              return (
                <div
                  key={item.product.id}
                  className="px-4 py-2.5 sm:py-3 hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  {/* Información minimalista del producto: Código y Nombre */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {code && (
                        <span className="font-mono text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                          {code}
                        </span>
                      )}
                      <h4 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                        {item.product.name}
                      </h4>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{formatBs(itemBs)} c/u</span>
                      {itemUsd > 0 && <span>({formatUsd(itemUsd)})</span>}
                    </div>
                  </div>

                  {/* Controles de cantidad compactos */}
                  <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-white text-slate-700 rounded transition-colors cursor-pointer"
                      title="Restar 1"
                    >
                      <Minus className="w-3 h-3 text-slate-700" />
                    </button>

                    <span className="w-7 text-center font-bold text-slate-900 text-xs">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      disabled={item.quantity >= item.product.stock}
                      onClick={() => {
                        const res = onAddToCart(item.product, 1);
                        if (!res.success && res.message) toastError(res.message);
                      }}
                      className="w-6 h-6 flex items-center justify-center hover:bg-white disabled:opacity-40 text-slate-700 rounded transition-colors cursor-pointer"
                      title="Sumar 1"
                    >
                      <Plus className="w-3 h-3 text-slate-700" />
                    </button>
                  </div>

                  {/* Subtotal del item */}
                  <div className="text-right min-w-[75px] sm:min-w-[90px] shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 block leading-tight">
                      {formatBs(totalItemBs)}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 block">
                      {formatUsd(totalItemUsd)}
                    </span>
                  </div>

                  {/* Eliminar producto */}
                  <button
                    type="button"
                    onClick={() => onRemoveFromCart(item.product.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Eliminar de la venta"
                  >
                    <Trash2 className="w-4 h-4 text-slate-500 hover:text-rose-600" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tarjeta fija en pantalla con los totales y el botón de cobrar */}
      {cart.length > 0 && (
        <div className="fixed bottom-14 left-0 right-0 z-30 px-3 pb-2 pt-1 pointer-events-none">
          <div className="max-w-5xl mx-auto pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                {/* Desglose de totales y descuento */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-semibold text-slate-800">{formatBs(subtotalBs)}</span>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomDiscount(discountPercent);
                        setIsDiscountPromptOpen(true);
                      }}
                      className="text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1 cursor-pointer font-medium ml-1"
                    >
                      <Percent className="w-3 h-3 text-slate-600" />
                      <span>Desc ({discountPercent}%):</span>
                    </button>
                    {discountAmountBs > 0 && (
                      <span className="text-emerald-600 font-bold">
                        -{formatBs(discountAmountBs)}
                      </span>
                    )}
                  </div>

                  {exchangeRateUsdToBs > 0 && (
                    <div className="text-[11px] text-slate-400">
                      Tasa: {formatBs(exchangeRateUsdToBs)}/USD
                    </div>
                  )}
                </div>

                {/* Total destacado */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Total
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                    {formatBs(totalBs)}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold block">
                    {formatUsd(totalUsd)}
                  </span>
                </div>
              </div>

              {/* Botón de cobrar fijo */}
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-white" />
                <span>Cobrar Venta ({formatBs(totalBs)})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cobro y Facturación */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        totalBase={totalBs}
        currencies={currencies}
        baseCurrency={baseCurrency}
        activeDisplayCurrency={activeDisplayCurrency}
        formatAmount={formatAmount}
        onConfirmSale={onCompleteSale}
      />

      {/* Modal de Recibo / Ticket de Venta */}
      <ReceiptModal
        isOpen={!!lastCompletedSale}
        sale={lastCompletedSale}
        onClose={onCloseReceipt}
        baseCurrencyCode={baseCurrency?.symbol || 'Bs.'}
      />

      {/* Modal de confirmación para vaciar la venta */}
      <ConfirmationModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={() => {
          onClearCart();
          setIsClearConfirmOpen(false);
          info('Venta vaciada.');
        }}
        title="Vaciar Productos Seleccionados"
        message="¿Estás seguro de que deseas quitar todos los productos de esta venta?"
        confirmText="Vaciar"
        isDestructive
      />

      {/* Modal de configuración de descuento */}
      {isDiscountPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Aplicar Descuento a la Venta
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Ingresa el porcentaje de descuento global (0% a 100%).
            </p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="number"
                min="0"
                max="100"
                value={customDiscount}
                onChange={(e) => setCustomDiscount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 font-bold text-slate-900"
              />
              <span className="text-sm font-bold text-slate-500">%</span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDiscountPromptOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyDiscount}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
