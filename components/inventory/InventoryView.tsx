'use client';

import React, { useState, useMemo } from 'react';
import { Product, ProductInput, StockAdjustment } from '../../models/product.model';
import { Currency } from '../../models/currency.model';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { ProductMovementsModal } from './ProductMovementsModal';
import { StockAdjustModal } from './StockAdjustModal';
import { useToast } from '../ui/ToastContext';
import { searchMatchesProduct, getProductBarcode } from '../../lib/product-matcher';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Layers,
  History,
} from 'lucide-react';

interface InventoryViewProps {
  products: Product[];
  onDeleteProduct: (id: string) => void;
  onEditProduct?: (product: Product) => void;
  onNavigateToAddProduct: () => void;
  searchTerm?: string;
  adjustments?: StockAdjustment[];
  // Props opcionales para retrocompatibilidad
  categories?: string[];
  lowStockProducts?: Product[];
  onAddProduct?: (input: ProductInput) => { success: boolean; error?: string };
  onUpdateProduct?: (id: string, input: ProductInput) => { success: boolean; error?: string };
  onAdjustStock?: (
    productId: string,
    type: 'in' | 'out',
    quantity: number,
    reason: string,
    description?: string
  ) => void;
  baseCurrency?: Currency;
  activeCurrency?: Currency;
  formatAmount?: (amount: number, code?: string) => string;
  convertFromBase?: (amount: number, code?: string) => number;
  formatBs?: (amount: number) => string;
  formatUsd?: (amount: number) => string;
  exchangeRateUsdToBs?: number;
  onSearchChange?: (val: string) => void;
}

export function InventoryView({
  products,
  onDeleteProduct,
  onEditProduct,
  onNavigateToAddProduct,
  searchTerm = '',
  adjustments = [],
  onAdjustStock,
}: InventoryViewProps) {
  const { success } = useToast();
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [inspectingMovementsProduct, setInspectingMovementsProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  // Lista de productos: si hay búsqueda activa en el header, filtra por coincidencia; de lo contrario muestra todos
  const displayProducts = useMemo(() => {
    const q = searchTerm.trim();
    if (!q) return products;
    return products.filter((p) => searchMatchesProduct(p, q));
  }, [products, searchTerm]);

  const handleDeleteConfirm = () => {
    if (!deletingProductId) return;
    onDeleteProduct(deletingProductId);
    setDeletingProductId(null);
    success('Producto eliminado del inventario.');
  };

  const handleEditClick = (product: Product) => {
    if (onEditProduct) {
      onEditProduct(product);
    } else {
      onNavigateToAddProduct();
    }
  };

  const handleAdjust = (
    productId: string,
    type: 'in' | 'out',
    quantity: number,
    reason: string,
    description?: string
  ) => {
    if (onAdjustStock) {
      onAdjustStock(productId, type, quantity, reason, description);
      success('Existencias ajustadas correctamente.');
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-28 pt-2 max-w-4xl mx-auto">
      {/* 1. Título de página y botón de agregar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Inventario
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {products.length} {products.length === 1 ? 'producto registrado' : 'productos registrados'}
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToAddProduct}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer select-none active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Agregar Producto</span>
        </button>
      </div>

      {/* 2. Lista de productos: código, nombre y controles nada más */}
      {products.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center max-w-md mx-auto my-6 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <Layers className="w-6 h-6 text-slate-600" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Inventario Vacío
          </h2>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Aún no has registrado ningún producto. Usa el botón «Agregar Producto» para comenzar.
          </p>
          <button
            type="button"
            onClick={onNavigateToAddProduct}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Agregar Primer Producto</span>
          </button>
        </div>
      ) : displayProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center my-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-700">
            No se encontraron productos coincidentes en el inventario.
          </p>
        </div>
      ) : (
        <>
          {/* Vista Desktop (Tabla limpia: Código, Nombre, Controles) */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3 w-44">Código</th>
                    <th className="px-5 py-3">Nombre</th>
                    <th className="px-5 py-3 text-right w-36">Controles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayProducts.map((p) => {
                    const code = getProductBarcode(p);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                            {code || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 text-sm">
                          {p.name}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setInspectingMovementsProduct(p)}
                              title="Historial de movimientos"
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <History className="w-4 h-4 text-slate-700" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditClick(p)}
                              title="Editar producto"
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4 text-slate-700" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingProductId(p.id)}
                              title="Eliminar producto"
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 text-slate-700" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista Mobile (Lista limpia: Código, Nombre, Controles) */}
          <div className="sm:hidden flex flex-col gap-2">
            {displayProducts.map((p) => {
              const code = getProductBarcode(p);
              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-block mb-1">
                      {code || 'Sin código'}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {p.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setInspectingMovementsProduct(p)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Historial de movimientos"
                    >
                      <History className="w-4 h-4 text-slate-700" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditClick(p)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4 text-slate-700" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingProductId(p.id)}
                      className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4 text-slate-700" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal de confirmación para eliminar */}
      <ConfirmationModal
        isOpen={!!deletingProductId}
        onClose={() => setDeletingProductId(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Producto"
        message="¿Estás seguro de que deseas eliminar este producto del inventario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        isDestructive
      />

      {/* Modal de Historial de Movimientos de cada Producto */}
      <ProductMovementsModal
        isOpen={!!inspectingMovementsProduct}
        onClose={() => setInspectingMovementsProduct(null)}
        product={
          inspectingMovementsProduct
            ? products.find((p) => p.id === inspectingMovementsProduct.id) || inspectingMovementsProduct
            : null
        }
        allAdjustments={adjustments}
        onOpenAdjustStock={(p) => setAdjustingProduct(p)}
      />

      {/* Modal de Ajuste de Existencias */}
      {onAdjustStock && (
        <StockAdjustModal
          isOpen={!!adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          product={adjustingProduct}
          onAdjust={handleAdjust}
        />
      )}
    </div>
  );
}
