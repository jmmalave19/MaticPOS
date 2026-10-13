'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, ProductInput, StockAdjustment } from '../models/product.model';
import { StorageService } from '../services/storage.service';
import { FirestoreService } from '../services/firestore.service';
import {
  findBestProductMatch,
  normalizeProductCode,
  matchesProductCode,
} from '../lib/product-matcher';

export function useInventoryController() {
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>(() => StorageService.getAdjustments());
  const [isLoaded] = useState(true);

  // Real-time Firestore sync
  useEffect(() => {
    const unsub = FirestoreService.subscribeToProducts(
      (remoteProducts) => {
        setProducts(remoteProducts);
      },
      (err) => {
        console.warn('Firestore fallback a local storage:', err);
      }
    );
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Sync products state with storage & Firestore
  const syncProducts = useCallback((newProducts: Product[]) => {
    setProducts(newProducts);
    StorageService.saveProducts(newProducts);
  }, []);

  // Add new product
  const addProduct = useCallback(
    (input: ProductInput): { success: boolean; product?: Product; error?: string } => {
      const cleanBarcode = input.barcode ? String(input.barcode).trim() : '';
      if (cleanBarcode) {
        const exists = products.some((p) => matchesProductCode(p, cleanBarcode));
        if (exists) {
          return { success: false, error: `Ya existe un producto con el código de barras "${cleanBarcode}"` };
        }
      }

      const now = new Date().toISOString();
      const priceUsd = Math.max(0, Number(input.priceUsd) || 0);
      const priceBs = Math.max(0, Number(input.priceBs) || (Number(input.sellingPrice) || 0));
      const costUsd = Math.max(0, Number(input.costUsd) || 0);
      const costBs = Math.max(0, Number(input.costBs) || (Number(input.costPrice) || 0));

      const newProduct: Product = {
        ...input,
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        barcode: cleanBarcode,
        name: input.name.trim(),
        category: input.category.trim() || 'General',
        priceCurrency: input.priceCurrency || 'USD',
        priceUsd,
        priceBs,
        costUsd,
        costBs,
        sellingPrice: priceBs, // Main currency in Bs
        costPrice: costBs,
        stock: Math.max(0, Number(input.stock) || 0),
        minStockAlert: Math.max(0, Number(input.minStockAlert) || 0),
        allowSellWithoutStock: !!input.allowSellWithoutStock,
        createdAt: now,
        updatedAt: now,
      };

      // Motivo de entrada por defecto al crear un producto: Nuevo registro
      const initialStockQty = Math.max(0, Number(input.stock) || 0);
      const initialAdjustment: StockAdjustment = {
        id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: newProduct.id,
        productName: newProduct.name,
        type: 'in',
        quantity: initialStockQty,
        reason: 'Nuevo registro',
        description: 'Registro inicial del producto',
        previousStock: 0,
        newStock: initialStockQty,
        timestamp: now,
      };

      newProduct.movements = [initialAdjustment];

      const nextList = [newProduct, ...products];
      syncProducts(nextList);

      const nextAdjustments = [initialAdjustment, ...adjustments];
      setAdjustments(nextAdjustments);
      StorageService.saveAdjustments(nextAdjustments);

      // Async write to Firestore
      FirestoreService.saveProduct(newProduct).catch((err) => {
        console.error('Error guardando producto en Firestore', err);
      });

      return { success: true, product: newProduct };
    },
    [products, adjustments, syncProducts]
  );

  // Update existing product
  const updateProduct = useCallback(
    (id: string, input: ProductInput): { success: boolean; error?: string } => {
      const cleanBarcode = input.barcode ? String(input.barcode).trim() : '';
      if (cleanBarcode) {
        const exists = products.some(
          (p) => p.id !== id && matchesProductCode(p, cleanBarcode)
        );
        if (exists) {
          return { success: false, error: `Ya existe otro producto con el código de barras "${cleanBarcode}"` };
        }
      }

      const now = new Date().toISOString();
      const priceUsd = Math.max(0, Number(input.priceUsd) || 0);
      const priceBs = Math.max(0, Number(input.priceBs) || (Number(input.sellingPrice) || 0));
      const costUsd = Math.max(0, Number(input.costUsd) || 0);
      const costBs = Math.max(0, Number(input.costBs) || (Number(input.costPrice) || 0));

      let updatedProduct: Product | undefined;

      const nextList = products.map((p) => {
        if (p.id === id) {
          updatedProduct = {
            ...p,
            ...input,
            barcode: cleanBarcode,
            name: input.name.trim(),
            category: input.category.trim() || 'General',
            priceCurrency: input.priceCurrency || p.priceCurrency || 'USD',
            priceUsd,
            priceBs,
            costUsd,
            costBs,
            sellingPrice: priceBs,
            costPrice: costBs,
            stock: p.stock, // El stock no se altera manualmente tras la creación
            minStockAlert: Math.max(0, Number(input.minStockAlert) || 0),
            allowSellWithoutStock: input.allowSellWithoutStock !== undefined ? !!input.allowSellWithoutStock : !!p.allowSellWithoutStock,
            updatedAt: now,
          };
          return updatedProduct;
        }
        return p;
      });

      syncProducts(nextList);

      if (updatedProduct) {
        FirestoreService.saveProduct(updatedProduct).catch((err) => {
          console.error('Error actualizando producto en Firestore', err);
        });
      }

      return { success: true };
    },
    [products, syncProducts]
  );

  // Delete product
  const deleteProduct = useCallback(
    (id: string) => {
      const nextList = products.filter((p) => p.id !== id);
      syncProducts(nextList);

      FirestoreService.deleteProduct(id).catch((err) => {
        console.error('Error eliminando producto en Firestore', err);
      });
    },
    [products, syncProducts]
  );

  // Adjust stock (solo entrada y salida)
  const adjustStock = useCallback(
    (
      productId: string,
      type: 'in' | 'out',
      quantity: number,
      reason: string,
      description?: string
    ) => {
      const target = products.find((p) => p.id === productId);
      if (!target) return;

      const prevStock = target.stock;
      let newStock = prevStock;

      if (type === 'in') {
        newStock = prevStock + Math.max(0, quantity);
      } else if (type === 'out') {
        newStock = Math.max(0, prevStock - Math.max(0, quantity));
      }

      const cleanReason = (reason || (type === 'in' ? 'Reposición' : 'Producto dañado / vencido')).replace(/\(\+\)\s*|\(-\)\s*/g, '').trim();

      const adjustment: StockAdjustment = {
        id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId,
        productName: target.name,
        type,
        quantity,
        reason: cleanReason,
        description: description?.trim() || undefined,
        previousStock: prevStock,
        newStock,
        timestamp: new Date().toISOString(),
      };

      const updatedProd: Product = {
        ...target,
        stock: newStock,
        movements: [adjustment, ...(target.movements || [])],
        updatedAt: new Date().toISOString(),
      };

      const nextProducts = products.map((p) => (p.id === productId ? updatedProd : p));
      const nextAdjustments = [adjustment, ...adjustments];

      syncProducts(nextProducts);
      setAdjustments(nextAdjustments);
      StorageService.saveAdjustments(nextAdjustments);

      FirestoreService.saveProduct(updatedProd).catch((err) => {
        console.error('Error actualizando stock en Firestore', err);
      });
    },
    [products, adjustments, syncProducts]
  );

  // Find product by barcode
  const findProductByBarcode = useCallback(
    (barcode: string): Product | undefined => {
      return findBestProductMatch(products, barcode);
    },
    [products]
  );

  // Categories list
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    products.forEach((p) => {
      if (p.category) catSet.add(p.category);
    });
    return Array.from(catSet).sort();
  }, [products]);

  // Low stock products alert list
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock <= p.minStockAlert);
  }, [products]);

  const reloadFromStorage = useCallback(() => {
    setProducts(StorageService.getProducts());
    setAdjustments(StorageService.getAdjustments());
  }, []);

  return {
    products,
    adjustments,
    categories,
    lowStockProducts,
    isLoaded,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    findProductByBarcode,
    syncProducts,
    reloadFromStorage,
  };
}
