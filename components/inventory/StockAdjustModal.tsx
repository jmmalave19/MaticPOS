'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Product } from '../../models/product.model';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAdjust: (
    productId: string,
    type: 'in' | 'out',
    quantity: number,
    reason: string,
    description?: string
  ) => void;
}

interface StockAdjustFormProps {
  product: Product;
  onClose: () => void;
  onAdjust: (
    productId: string,
    type: 'in' | 'out',
    quantity: number,
    reason: string,
    description?: string
  ) => void;
}

function StockAdjustForm({ product, onClose, onAdjust }: StockAdjustFormProps) {
  const [type, setType] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('Reposición');
  const [description, setDescription] = useState<string>('');

  const handleSelectType = (newType: 'in' | 'out') => {
    setType(newType);
    if (newType === 'in') {
      setReason('Reposición');
    } else {
      setReason('Producto dañado / vencido');
    }
  };

  const currentStock = product.stock;
  const safeQty = Math.max(1, quantity);
  const resultingStock =
    type === 'in'
      ? currentStock + safeQty
      : Math.max(0, currentStock - safeQty);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (safeQty <= 0) return;
    onAdjust(product.id, type, safeQty, reason, description.trim() || undefined);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Selector exclusivo: Solo Entrada y Salida */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Tipo de Ajuste
        </label>
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleSelectType('in')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              type === 'in'
                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Entrada</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectType('out')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              type === 'out'
                ? 'bg-white text-rose-700 shadow-xs border border-rose-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Salida</span>
          </button>
        </div>
      </div>

      {/* Cantidad a ajustar */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Cantidad a {type === 'in' ? 'ingresar' : 'retirar'}
        </label>
        <input
          type="number"
          min="1"
          required
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 font-semibold"
        />
      </div>

      {/* Resumen de stock actual y resultante */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
        <span className="text-slate-500">
          Stock Actual: <strong className="text-slate-800">{currentStock}</strong>
        </span>
        <span className="text-slate-500">
          Stock Resultante:{' '}
          <strong className={type === 'in' ? 'text-emerald-700' : 'text-slate-900'}>
            {resultingStock}
          </strong>
        </span>
      </div>

      {/* Motivos de ajuste seleccionables */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Motivo del Ajuste
        </label>
        {type === 'in' ? (
          <div className="space-y-1.5">
            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                reason === 'Reposición'
                  ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="stock-reason"
                value="Reposición"
                checked={reason === 'Reposición'}
                onChange={() => setReason('Reposición')}
                className="accent-slate-900"
              />
              <span>Reposición</span>
            </label>

            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                reason === 'Compra de mercancía'
                  ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="stock-reason"
                value="Compra de mercancía"
                checked={reason === 'Compra de mercancía'}
                onChange={() => setReason('Compra de mercancía')}
                className="accent-slate-900"
              />
              <span>Compra de mercancía</span>
            </label>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                reason === 'Producto dañado / vencido'
                  ? 'border-rose-600 bg-rose-50/50 text-rose-900'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="stock-reason"
                value="Producto dañado / vencido"
                checked={reason === 'Producto dañado / vencido'}
                onChange={() => setReason('Producto dañado / vencido')}
                className="accent-slate-900"
              />
              <span>Producto dañado / vencido</span>
            </label>

            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                reason === 'Uso propio'
                  ? 'border-rose-600 bg-rose-50/50 text-rose-900'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="stock-reason"
                value="Uso propio"
                checked={reason === 'Uso propio'}
                onChange={() => setReason('Uso propio')}
                className="accent-slate-900"
              />
              <span>Uso propio</span>
            </label>

            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                reason === 'Merma / Pérdida'
                  ? 'border-rose-600 bg-rose-50/50 text-rose-900'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="stock-reason"
                value="Merma / Pérdida"
                checked={reason === 'Merma / Pérdida'}
                onChange={() => setReason('Merma / Pérdida')}
                className="accent-slate-900"
              />
              <span>Merma / Pérdida</span>
            </label>
          </div>
        )}
      </div>

      {/* Descripción del ajuste (opcional) */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Descripción <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalle o nota adicional sobre el ajuste..."
          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 placeholder:text-slate-400"
        />
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Aplicar Ajuste
        </button>
      </div>
    </form>
  );
}

export function StockAdjustModal({
  isOpen,
  onClose,
  product,
  onAdjust,
}: StockAdjustModalProps) {
  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajuste de Existencias"
      subtitle={`Producto: ${product.name}`}
      maxWidth="sm"
    >
      <StockAdjustForm
        key={`${product.id}_${isOpen ? 'open' : 'closed'}`}
        product={product}
        onClose={onClose}
        onAdjust={onAdjust}
      />
    </Modal>
  );
}
