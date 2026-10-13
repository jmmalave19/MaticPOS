'use client';

import React, { useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Product, StockAdjustment } from '../../models/product.model';
import { getProductBarcode } from '../../lib/product-matcher';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Layers,
  Calendar,
  PlusCircle,
} from 'lucide-react';

interface ProductMovementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  allAdjustments?: StockAdjustment[];
  onOpenAdjustStock?: (product: Product) => void;
}

export function ProductMovementsModal({
  isOpen,
  onClose,
  product,
  allAdjustments = [],
  onOpenAdjustStock,
}: ProductMovementsModalProps) {
  // Combina los movimientos propios del producto con los ajustes globales por si hay registros previos
  const movements = useMemo(() => {
    if (!product) return [];

    const list: StockAdjustment[] = [];
    const seenIds = new Set<string>();

    // 1. Movimientos propios del producto
    if (Array.isArray(product.movements)) {
      for (const m of product.movements) {
        if (m && m.id && !seenIds.has(m.id)) {
          seenIds.add(m.id);
          list.push(m);
        }
      }
    }

    // 2. Ajustes globales correspondientes a este producto
    if (Array.isArray(allAdjustments)) {
      for (const a of allAdjustments) {
        if (a && a.productId === product.id && a.id && !seenIds.has(a.id)) {
          seenIds.add(a.id);
          list.push(a);
        }
      }
    }

    // Ordenar de más reciente a más antiguo
    return list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [product, allAdjustments]);

  // Resumen de totales de entradas y salidas
  const summary = useMemo(() => {
    let totalInQty = 0;
    let totalOutQty = 0;
    let inCount = 0;
    let outCount = 0;

    for (const m of movements) {
      if (m.type === 'in') {
        totalInQty += m.quantity;
        inCount += 1;
      } else {
        totalOutQty += m.quantity;
        outCount += 1;
      }
    }

    return { totalInQty, totalOutQty, inCount, outCount, total: movements.length };
  }, [movements]);

  if (!product) return null;

  const barcode = getProductBarcode(product);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Historial de Movimientos"
      subtitle={product.name}
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        {/* Cabecera del producto e indicadores de stock */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                {barcode || 'Sin código'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Categoría: <strong>{product.category || 'General'}</strong>
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Existencias actuales:{' '}
              <strong className="text-slate-900 text-sm font-black">{product.stock}</strong> unidades
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAdjustStock && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdjustStock(product);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer select-none"
              >
                <PlusCircle className="w-3.5 h-3.5 text-white" />
                <span>Ajustar Stock</span>
              </button>
            )}
          </div>
        </div>

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Movimientos
            </span>
            <span className="text-sm font-black text-slate-800 mt-0.5 block">
              {summary.total}
            </span>
          </div>

          <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">
              Entradas
            </span>
            <span className="text-sm font-black text-emerald-700 mt-0.5 block">
              +{summary.totalInQty} ({summary.inCount})
            </span>
          </div>

          <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-rose-600 block tracking-wider">
              Salidas
            </span>
            <span className="text-sm font-black text-rose-700 mt-0.5 block">
              -{summary.totalOutQty} ({summary.outCount})
            </span>
          </div>
        </div>

        {/* Lista de movimientos */}
        <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-0.5">
          {movements.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
              <History className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-800">
                Sin movimientos registrados
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Los ajustes, ventas y entradas de este producto se mostrarán aquí.
              </p>
            </div>
          ) : (
            movements.map((m) => {
              const isEntry = m.type === 'in';
              const cleanReason = m.reason
                ? m.reason.replace(/\(\+\)\s*|\(-\)\s*/g, '').trim()
                : isEntry
                ? 'Entrada'
                : 'Salida';

              const dateStr = new Date(m.timestamp).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const timeStr = new Date(m.timestamp).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={m.id}
                  className="bg-white border border-slate-200/90 rounded-xl p-3 flex items-start justify-between gap-3 shadow-2xs hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isEntry
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      }`}
                    >
                      {isEntry ? (
                        <ArrowDownLeft className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-rose-700" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isEntry
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {isEntry ? 'Entrada' : 'Salida'}
                        </span>

                        <span className="text-xs font-bold text-slate-900">
                          {cleanReason}
                        </span>
                      </div>

                      {m.description && (
                        <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                          {m.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {dateStr} • {timeStr}
                        </span>
                        <span>•</span>
                        <span>
                          Stock: {m.previousStock} → <strong>{m.newStock}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-black block ${
                        isEntry ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isEntry ? `+${m.quantity}` : `-${m.quantity}`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">unidades</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Botón de cierre */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer select-none"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
