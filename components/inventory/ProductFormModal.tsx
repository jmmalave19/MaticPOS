'use client';

import React, { useState, useId } from 'react';
import { Modal } from '../ui/Modal';
import { Product, ProductInput } from '../../models/product.model';
import { Currency } from '../../models/currency.model';
import { Barcode, TrendingUp, DollarSign, ShieldAlert, Lock } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: ProductInput) => void;
  initialProduct?: Product | null;
  baseCurrency: Currency;
  activeCurrency: Currency;
  existingCategories: string[];
  exchangeRateUsdToBs?: number;
}

function ProductFormContent({
  initialProduct,
  onSubmit,
  onClose,
  exchangeRate = 36.5,
}: {
  initialProduct?: Product | null;
  baseCurrency: Currency;
  activeCurrency: Currency;
  existingCategories: string[];
  onSubmit: (input: ProductInput) => void;
  onClose: () => void;
  exchangeRate?: number;
}) {
  const allowSellWithoutStockId = useId();
  const isEditing = !!initialProduct;

  // 1. Nombre
  const [name, setName] = useState(initialProduct?.name || '');
  const [barcode, setBarcode] = useState(
    initialProduct?.barcode || (initialProduct as { code?: string })?.code || ''
  );

  // 2. Moneda
  const [currency, setCurrency] = useState<'USD' | 'VES'>(
    initialProduct?.priceCurrency || 'USD'
  );

  // Initial cost and price based on selected currency
  const initCost = initialProduct
    ? (initialProduct.priceCurrency === 'VES'
        ? (initialProduct.costBs || initialProduct.costPrice || 0)
        : (initialProduct.costUsd || (exchangeRate > 0 ? (initialProduct.costBs || 0) / exchangeRate : 0)))
    : 0;

  const initPrice = initialProduct
    ? (initialProduct.priceCurrency === 'VES'
        ? (initialProduct.priceBs || initialProduct.sellingPrice || 0)
        : (initialProduct.priceUsd || (exchangeRate > 0 ? (initialProduct.priceBs || 0) / exchangeRate : 0)))
    : 0;

  // 3. Precio de costo
  const [costPriceStr, setCostPriceStr] = useState(initCost > 0 ? initCost.toString() : '');

  // 4. Precio de venta
  const [sellingPriceStr, setSellingPriceStr] = useState(initPrice > 0 ? initPrice.toString() : '');

  // 5. Stock inicial (si ya existe, no se puede alterar manualmente)
  const [stockStr, setStockStr] = useState((initialProduct?.stock ?? 0).toString());

  // 6. Vender sin stock
  const [allowSellWithoutStock, setAllowSellWithoutStock] = useState(
    initialProduct?.allowSellWithoutStock ?? false
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Numerical calculations
  const cost = Math.max(0, parseFloat(costPriceStr) || 0);
  const price = Math.max(0, parseFloat(sellingPriceStr) || 0);
  const stock = Math.max(0, parseInt(stockStr, 10) || 0);

  // Profits in the current currency
  const hasCost = cost > 0;
  const hasPrice = price > 0;
  const unitProfit = price - cost;
  const profitMarginCost = hasCost ? ((unitProfit / cost) * 100) : (hasPrice ? 100 : 0);
  const profitMarginSale = hasPrice ? ((unitProfit / price) * 100) : 0;
  const totalPotentialProfit = unitProfit * stock;
  const totalInvestment = cost * stock;

  const formatCurrency = (amt: number) => {
    return currency === 'USD' ? `$ ${amt.toFixed(2)}` : `Bs. ${amt.toFixed(2)}`;
  };

  const formatAlternateCurrency = (amt: number) => {
    if (exchangeRate <= 0) return '';
    if (currency === 'USD') {
      return `Bs. ${(amt * exchangeRate).toFixed(2)}`;
    } else {
      return `$ ${(amt / exchangeRate).toFixed(2)}`;
    }
  };

  const handleCurrencyChange = (newCur: 'USD' | 'VES') => {
    if (newCur === currency) return;
    if (exchangeRate > 0) {
      if (newCur === 'VES') {
        if (costPriceStr) setCostPriceStr((cost * exchangeRate).toFixed(2));
        if (sellingPriceStr) setSellingPriceStr((price * exchangeRate).toFixed(2));
      } else {
        if (costPriceStr) setCostPriceStr((cost / exchangeRate).toFixed(2));
        if (sellingPriceStr) setSellingPriceStr((price / exchangeRate).toFixed(2));
      }
    }
    setCurrency(newCur);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('El nombre del producto es obligatorio.');
      return;
    }
    if (price <= 0) {
      setErrorMsg('El precio de venta debe ser mayor a cero.');
      return;
    }

    let pUsd = 0;
    let pBs = 0;
    let cUsd = 0;
    let cBs = 0;

    if (currency === 'USD') {
      pUsd = price;
      pBs = exchangeRate > 0 ? Number((price * exchangeRate).toFixed(2)) : 0;
      cUsd = cost;
      cBs = exchangeRate > 0 ? Number((cost * exchangeRate).toFixed(2)) : 0;
    } else {
      pBs = price;
      pUsd = exchangeRate > 0 ? Number((price / exchangeRate).toFixed(2)) : 0;
      cBs = cost;
      cUsd = exchangeRate > 0 ? Number((cost / exchangeRate).toFixed(2)) : 0;
    }

    const payload: ProductInput = {
      name: cleanName,
      barcode: barcode.trim(),
      category: initialProduct?.category || 'General',
      priceCurrency: currency,
      priceUsd: pUsd,
      priceBs: pBs,
      costUsd: cUsd,
      costBs: cBs,
      sellingPrice: pBs,
      costPrice: cBs,
      // Si se está editando, se conserva el stock existente (no editable manualmente)
      stock: isEditing ? (initialProduct?.stock ?? 0) : stock,
      minStockAlert: initialProduct?.minStockAlert ?? 3,
      allowSellWithoutStock,
      notes: initialProduct?.notes,
    };

    onSubmit(payload);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* 1. Nombre */}
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1">
          Nombre del Producto *
        </label>
        <input
          type="text"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Harina de Trigo 1Kg"
          className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 font-medium text-slate-900"
        />
      </div>

      {/* Código de barras / Código */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-800">
            Código de barras / Código
          </label>
          <span className="text-[11px] text-slate-500 font-medium">
            (Opcional)
          </span>
        </div>
        <div className="relative">
          <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Ej. 7501031311309 o código corto"
            className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 font-mono text-slate-900"
          />
        </div>
      </div>

      {/* 2. Moneda */}
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1">
          Moneda
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => handleCurrencyChange('USD')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              currency === 'USD'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-slate-700" />
            <span>Dólares ($ USD)</span>
          </button>
          <button
            type="button"
            onClick={() => handleCurrencyChange('VES')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              currency === 'VES'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Bolívares (Bs. VES)</span>
          </button>
        </div>
      </div>

      {/* 3. Precio de costo */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-800">
            Precio de costo
          </label>
          {cost > 0 && exchangeRate > 0 && (
            <span className="text-[11px] text-slate-500 font-medium">
              Equiv: {formatAlternateCurrency(cost)}
            </span>
          )}
        </div>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
            {currency === 'USD' ? '$' : 'Bs.'}
          </span>
          <input
            type="number"
            step="any"
            min="0"
            value={costPriceStr}
            onChange={(e) => setCostPriceStr(e.target.value)}
            placeholder="0.00"
            className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 font-semibold text-slate-900"
          />
        </div>
      </div>

      {/* 4. Precio de venta */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-800">
            Precio de venta *
          </label>
          {price > 0 && exchangeRate > 0 && (
            <span className="text-[11px] text-slate-500 font-medium">
              Equiv: {formatAlternateCurrency(price)}
            </span>
          )}
        </div>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
            {currency === 'USD' ? '$' : 'Bs.'}
          </span>
          <input
            type="number"
            step="any"
            min="0"
            required
            value={sellingPriceStr}
            onChange={(e) => setSellingPriceStr(e.target.value)}
            placeholder="0.00"
            className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 font-bold text-slate-900"
          />
        </div>
      </div>

      {/* 5. Stock inicial */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-800">
            Stock inicial
          </label>
          {isEditing && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <Lock className="w-3 h-3 text-slate-400" />
              Bloqueado tras creación
            </span>
          )}
        </div>
        <input
          type="number"
          min="0"
          step="1"
          disabled={isEditing}
          value={stockStr}
          onChange={(e) => setStockStr(e.target.value)}
          placeholder="0"
          className={`w-full px-3.5 py-2 text-sm border rounded-xl font-semibold transition-all ${
            isEditing
              ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed select-none'
              : 'bg-slate-50/70 border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800'
          }`}
        />
        <p className="text-[11px] text-slate-500 mt-1">
          (Una vez creado el producto el stock no puede ser alterado manualmente)
        </p>
      </div>

      {/* ESTADÍSTICA DE GANANCIAS DEL PRODUCTO (DEBAJO DEL STOCK) */}
      <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-slate-700" />
            Estadística de ganancias
          </span>
          {hasPrice && hasCost && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                unitProfit >= 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {unitProfit >= 0 ? '+' : ''}
              {profitMarginCost.toFixed(1)}% margen
            </span>
          )}
        </div>

        {hasPrice ? (
          <div className="grid grid-cols-3 gap-2 pt-0.5">
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold block">
                Ganancia Unitaria
              </span>
              <span
                className={`text-xs font-bold block mt-0.5 ${
                  unitProfit > 0
                    ? 'text-emerald-700'
                    : unitProfit < 0
                    ? 'text-rose-700'
                    : 'text-slate-800'
                }`}
              >
                {formatCurrency(unitProfit)}
              </span>
              {hasCost && (
                <span className="text-[9px] text-slate-500 block">
                  {profitMarginSale.toFixed(1)}% s/venta
                </span>
              )}
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold block">
                Ganancia Total
              </span>
              <span
                className={`text-xs font-bold block mt-0.5 ${
                  totalPotentialProfit > 0
                    ? 'text-emerald-700'
                    : totalPotentialProfit < 0
                    ? 'text-rose-700'
                    : 'text-slate-800'
                }`}
              >
                {formatCurrency(totalPotentialProfit)}
              </span>
              <span className="text-[9px] text-slate-500 block">
                Stock: {stock}
              </span>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold block">
                Inversión Costo
              </span>
              <span className="text-xs font-bold text-slate-800 block mt-0.5">
                {formatCurrency(totalInvestment)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 italic">
            Ingresa precio y costo para calcular las ganancias.
          </p>
        )}

        {hasPrice && hasCost && unitProfit < 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-rose-700 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>El precio de venta es menor al costo.</span>
          </div>
        )}
      </div>

      {/* 6. Vender sin stock */}
      <div>
        <label
          htmlFor={allowSellWithoutStockId}
          className="flex items-start gap-2.5 p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <input
            id={allowSellWithoutStockId}
            type="checkbox"
            checked={allowSellWithoutStock}
            onChange={(e) => setAllowSellWithoutStock(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-800 cursor-pointer"
          />
          <div className="flex-1">
            <span className="text-xs font-bold text-slate-900 block select-none">
              Vender sin stock
            </span>
            <span className="text-[11px] text-slate-500 block select-none">
              Permite vender este producto aun cuando las existencias estén en 0.
            </span>
          </div>
        </label>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer"
        >
          {isEditing ? 'Guardar Cambios' : 'Registrar Producto'}
        </button>
      </div>
    </form>
  );
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialProduct,
  baseCurrency,
  activeCurrency,
  existingCategories,
  exchangeRateUsdToBs = 36.5,
}: ProductFormModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialProduct ? 'Editar Producto' : 'Nuevo Producto'}
      subtitle={
        initialProduct
          ? 'Modifica los datos del producto en catálogo'
          : 'Registra un nuevo producto en tu inventario'
      }
      maxWidth="md"
    >
      <ProductFormContent
        key={initialProduct?.id || 'new_product'}
        initialProduct={initialProduct}
        baseCurrency={baseCurrency}
        activeCurrency={activeCurrency}
        existingCategories={existingCategories}
        onSubmit={onSubmit}
        onClose={onClose}
        exchangeRate={exchangeRateUsdToBs}
      />
    </Modal>
  );
}
