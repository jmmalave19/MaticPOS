'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppModule } from './BottomNav';
import { Product } from '../../models/product.model';
import { HeaderBarcodeScanner } from '../scanner/HeaderBarcodeScanner';
import {
  searchMatchesProduct,
  findBestProductMatch,
  findProductByExactCode,
  getProductBarcode,
  normalizeProductCode,
} from '../../lib/product-matcher';
import {
  Barcode,
  Search,
  X,
  Plus,
} from 'lucide-react';

interface HeaderProps {
  activeModule: AppModule;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onBarcodeScanned: (barcode: string) => void;
  onNavigateToModule?: (module: AppModule) => void;
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
  exchangeRateUsdToBs?: number;
  formatBs?: (amount: number) => string;
  formatUsd?: (amount: number) => string;
  isDayOpen?: boolean;
}

export function Header({
  activeModule,
  searchTerm,
  onSearchChange,
  onBarcodeScanned,
  products = [],
  onSelectProduct,
  exchangeRateUsdToBs = 0,
  formatBs = (amt: number) => `Bs. ${amt.toFixed(2)}`,
  formatUsd = (amt: number) => `$${amt.toFixed(2)}`,
}: HeaderProps) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const getPlaceholder = () => {
    switch (activeModule) {
      case 'pos':
        return 'Buscar producto por nombre o código...';
      case 'inventory':
        return 'Buscar en inventario por nombre o código...';
      case 'add-product':
        return 'Buscar en catálogo...';
      default:
        return 'Buscar por nombre o código de barras...';
    }
  };

  // Coincidencias de búsqueda: busca por nombre y código de barras, máx 8 resultados
  const searchResults = useMemo(() => {
    const q = searchTerm.trim();
    if (!q || !products || products.length === 0) return [];

    return products
      .filter((p) => searchMatchesProduct(p, q))
      .slice(0, 8); // Máximo 8 resultados requeridos
  }, [products, searchTerm]);

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manejar cambio en el input: si coincide exactamente con el código de un producto, ingresarlo automáticamente
  const handleInputChange = (val: string) => {
    onSearchChange(val);
    const clean = val.trim();
    if (!clean || products.length === 0) {
      setIsDropdownOpen(false);
      return;
    }

    // Coincidencia exacta directa con el código de barras o código
    const exactMatch = findProductByExactCode(products, clean);

    if (exactMatch) {
      if (onSelectProduct) {
        onSelectProduct(exactMatch);
      }
      setIsDropdownOpen(false);
    } else {
      setIsDropdownOpen(true);
    }
  };

  // Al presionar Enter en el formulario de búsqueda
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;

    // Buscar coincidencia exacta directa por código o mejor coincidencia
    const targetProduct =
      findProductByExactCode(products, q) ||
      findBestProductMatch(products, q) ||
      (searchResults.length > 0 ? searchResults[0] : null);

    if (targetProduct) {
      if (onSelectProduct) {
        onSelectProduct(targetProduct);
      }
      setIsDropdownOpen(false);
    } else {
      // Si no se encuentra producto en la lista en memoria, enviar a escáner/búsqueda general
      onBarcodeScanned(q);
      setIsDropdownOpen(false);
    }
  };

  const handleSelect = (product: Product) => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
    setIsDropdownOpen(false);
  };

  const handleScan = (scannedCode: string) => {
    const clean = scannedCode.trim();
    if (!clean) return;

    // 1. Auto-ingresar el resultado en la barra de búsqueda para buscar el producto
    onSearchChange(clean);
    setIsScannerOpen(false);

    // 2. Comprobar si coincide exactamente con el código del producto
    const exactMatch = findProductByExactCode(products, clean);

    if (exactMatch) {
      if (onSelectProduct) {
        onSelectProduct(exactMatch);
      }
      setIsDropdownOpen(false);
    } else {
      setIsDropdownOpen(true);
      onBarcodeScanned(clean);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-100/70 backdrop-blur-md px-3 sm:px-6 py-2.5 transition-all">
      <div ref={containerRef} className="max-w-3xl mx-auto w-full flex flex-col gap-2 relative">
        {/* Buscador y botón de código de barras */}
        <form
          onSubmit={handleSubmit}
          className="w-full flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            
            <input
              type="text"
              value={searchTerm}
              onFocus={() => {
                if (searchTerm.trim()) setIsDropdownOpen(true);
              }}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsDropdownOpen(false);
                }
              }}
              placeholder={getPlaceholder()}
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 font-medium text-slate-900 placeholder:text-slate-400 transition-all"
            />

            {/* Botón para limpiar búsqueda */}
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  setIsDropdownOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )}
          </div>

          {/* Botón para abrir/cerrar lector de código de barras debajo del input */}
          <button
            type="button"
            onClick={() => {
              setIsScannerOpen((prev) => {
                if (!prev) setIsDropdownOpen(false);
                return !prev;
              });
            }}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-2xl transition-all shadow-xs shrink-0 select-none cursor-pointer ${
              isScannerOpen
                ? 'bg-slate-800 text-white ring-2 ring-slate-400/40'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
            title={isScannerOpen ? 'Ocultar lector de códigos' : 'Abrir lector de código de barras'}
          >
            <Barcode className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">{isScannerOpen ? 'Cerrar' : 'Escanear'}</span>
          </button>
        </form>

        {/* Dropdown flotante con hasta 8 resultados por nombre o código */}
        {isDropdownOpen && searchTerm.trim() && !isScannerOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No se encontraron productos para &ldquo;<span className="font-semibold text-slate-700">{searchTerm.trim()}</span>&rdquo; (búsqueda por nombre y código)
              </div>
            ) : (
              searchResults.map((product) => {
                const pBs =
                  product.priceCurrency === 'USD' && exchangeRateUsdToBs > 0
                    ? Number((product.priceUsd * exchangeRateUsdToBs).toFixed(2))
                    : product.priceBs || product.sellingPrice;
                const pUsd =
                  product.priceUsd ||
                  (exchangeRateUsdToBs > 0 ? pBs / exchangeRateUsdToBs : 0);
                const isOutOfStock = product.stock <= 0;

                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={isOutOfStock && activeModule === 'pos'}
                    onClick={() => handleSelect(product)}
                    className="w-full p-2.5 sm:p-3 text-left flex items-center justify-between gap-3 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {product.name}
                        </span>
                        {isOutOfStock && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            Agotado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[10px] text-slate-600">
                          {getProductBarcode(product) || 'Sin código'}
                        </span>
                        <span>• Stock: {product.stock}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <span className="text-xs sm:text-sm font-black text-slate-900 block leading-tight">
                          {formatBs(pBs)}
                        </span>
                        {exchangeRateUsdToBs > 0 && (
                          <span className="text-[10px] font-medium text-slate-500 block">
                            {formatUsd(pUsd)}
                          </span>
                        )}
                      </div>

                      {activeModule === 'pos' && !isOutOfStock && (
                        <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                          <Plus className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Lector de código de barras desplegable debajo del input con altura 15vh */}
        {isScannerOpen && (
          <HeaderBarcodeScanner
            onScan={handleScan}
            onClose={() => setIsScannerOpen(false)}
            title={
              activeModule === 'add-product'
                ? 'Escanear Código'
                : activeModule === 'pos'
                ? 'Escanear para Vender'
                : 'Escanear Código'
            }
          />
        )}
      </div>
    </header>
  );
}
