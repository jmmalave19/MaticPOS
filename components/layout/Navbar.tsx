'use client';

import React from 'react';
import { Currency } from '../../models/currency.model';
import { ShoppingBag, Layers, BarChart3, Settings2 } from 'lucide-react';

export type ActiveTab = 'pos' | 'inventory' | 'reports';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  baseCurrency: Currency;
  activeDisplayCurrency: Currency;
  onOpenCurrencySettings: () => void;
  lowStockCount: number;
  cartCount: number;
}

export function Navbar({
  activeTab,
  onSelectTab,
  baseCurrency,
  activeDisplayCurrency,
  onOpenCurrencySettings,
  lowStockCount,
  cartCount,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs">
            SV
          </div>
          <div>
            <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight block leading-tight">
              StockVenta
            </span>
            <span className="text-[10px] text-slate-500 font-medium block leading-tight">
              POS & Inventario
            </span>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onSelectTab('pos')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pos'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-slate-700" />
            <span>Punto de Venta</span>
            {cartCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'inventory'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-slate-700" />
            <span>Inventario</span>
            {lowStockCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('reports')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'reports'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-slate-700" />
            <span>Reportes del Día</span>
          </button>
        </nav>

        {/* Multicurrency Pill & Settings */}
        <div className="flex items-center gap-2">
          {/* Multicurrency indicator button */}
          <button
            type="button"
            onClick={onOpenCurrencySettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors shadow-2xs"
            title="Configurar monedas y tasas de cambio"
          >
            <span className="text-slate-500 font-mono text-[11px]">
              {baseCurrency.code}:
            </span>
            <span>
              {activeDisplayCurrency.code} ({activeDisplayCurrency.symbol})
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenCurrencySettings}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Ajustes y Respaldo"
          >
            <Settings2 className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>
    </header>
  );
}
