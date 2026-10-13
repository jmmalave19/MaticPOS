'use client';

import { useState, useCallback, useMemo } from 'react';
import { CartItem, PaymentMethod, Sale, SaleItem } from '../models/sale.model';
import { Product, StockAdjustment } from '../models/product.model';
import { Currency } from '../models/currency.model';
import { StorageService } from '../services/storage.service';
import { FirestoreService } from '../services/firestore.service';
import { AudioService } from '../services/audio.service';

interface POSControllerProps {
  products: Product[];
  onStockDeducted: (updatedProducts: Product[]) => void;
  exchangeRateUsdToBs: number;
  activeSessionId?: string;
}

export function usePOSController({
  products,
  onStockDeducted,
  exchangeRateUsdToBs,
  activeSessionId,
}: POSControllerProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  // Add product to cart (or increment qty)
  const addToCart = useCallback(
    (product: Product, quantityToAdd: number = 1): { success: boolean; message?: string } => {
      const currentProd = products.find((p) => p.id === product.id) || product;
      const canSellWithoutStock = !!currentProd.allowSellWithoutStock;

      if (!canSellWithoutStock && currentProd.stock <= 0) {
        AudioService.playScanWarning();
        return { success: false, message: `El producto "${currentProd.name}" no tiene existencias disponibles.` };
      }

      let success = true;
      let message: string | undefined;

      setCart((prevCart) => {
        const existingIndex = prevCart.findIndex((item) => item.product.id === currentProd.id);

        if (existingIndex > -1) {
          const currentQty = prevCart[existingIndex].quantity;
          const nextQty = currentQty + quantityToAdd;

          if (!canSellWithoutStock && nextQty > currentProd.stock) {
            AudioService.playScanWarning();
            success = false;
            message = `Stock máximo disponible alcanzado (${currentProd.stock} unidades).`;
            return prevCart;
          }

          const updated = [...prevCart];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: nextQty,
          };
          AudioService.playScanSuccess();
          return updated;
        } else {
          if (!canSellWithoutStock && quantityToAdd > currentProd.stock) {
            AudioService.playScanWarning();
            success = false;
            message = `Stock insuficiente. Disponible: ${currentProd.stock}`;
            return prevCart;
          }

          AudioService.playScanSuccess();
          return [
            ...prevCart,
            {
              product: currentProd,
              quantity: quantityToAdd,
            },
          ];
        }
      });

      return { success, message };
    },
    [products]
  );

  // Remove single item from cart
  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  // Update item quantity directly
  const updateQuantity = useCallback(
    (productId: string, newQty: number) => {
      const currentProd = products.find((p) => p.id === productId);
      const canSellWithoutStock = !!currentProd?.allowSellWithoutStock;
      const maxStock = canSellWithoutStock ? 999999 : (currentProd ? currentProd.stock : 99999);

      if (newQty <= 0) {
        removeFromCart(productId);
        return;
      }

      setCart((prev) =>
        prev.map((item) => {
          if (item.product.id === productId) {
            const safeQty = Math.min(newQty, maxStock);
            return { ...item, quantity: safeQty };
          }
          return item;
        })
      );
    },
    [products, removeFromCart]
  );

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountPercent(0);
  }, []);

  // Subtotal in Bs (primary currency)
  const subtotalBs = useMemo(() => {
    return cart.reduce((acc, item) => {
      const priceBs = item.product.priceBs || item.product.sellingPrice;
      return acc + priceBs * item.quantity;
    }, 0);
  }, [cart]);

  // Discount amount in Bs
  const discountAmountBs = useMemo(() => {
    if (discountPercent <= 0) return 0;
    return Number(((subtotalBs * discountPercent) / 100).toFixed(2));
  }, [subtotalBs, discountPercent]);

  // Total in Bs
  const totalBs = useMemo(() => {
    return Math.max(0, subtotalBs - discountAmountBs);
  }, [subtotalBs, discountAmountBs]);

  // Total in USD (secondary currency)
  const totalUsd = useMemo(() => {
    if (exchangeRateUsdToBs <= 0) return 0;
    return Number((totalBs / exchangeRateUsdToBs).toFixed(2));
  }, [totalBs, exchangeRateUsdToBs]);

  // Total items count
  const totalItemsCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Process checkout and complete sale
  const completeSale = useCallback(
    (params: {
      paymentCurrency: Currency;
      paymentMethod: PaymentMethod;
      amountTenderedInCurrency: number;
      customerName?: string;
      customerDoc?: string;
      notes?: string;
    }): { success: boolean; sale?: Sale; error?: string } => {
      if (cart.length === 0) {
        return { success: false, error: 'El carrito está vacío.' };
      }

      const {
        paymentCurrency,
        paymentMethod,
        amountTenderedInCurrency,
        customerName,
        customerDoc,
        notes,
      } = params;

      const rate = paymentCurrency.rateToBase;
      const totalInCurrency = paymentCurrency.code === 'USD'
        ? totalUsd
        : paymentCurrency.code === 'VES'
        ? totalBs
        : Number((totalBs * rate).toFixed(paymentCurrency.decimalPlaces));

      const tendered = Math.max(0, amountTenderedInCurrency);
      const changeGivenInCurrency = paymentMethod === 'efectivo' 
        ? Math.max(0, Number((tendered - totalInCurrency).toFixed(paymentCurrency.decimalPlaces)))
        : 0;

      // Build sale items with both Bs and USD
      const saleItems: SaleItem[] = cart.map((item) => {
        const itemPriceBs = item.product.priceBs || item.product.sellingPrice;
        const itemPriceUsd = item.product.priceUsd || (exchangeRateUsdToBs > 0 ? Number((itemPriceBs / exchangeRateUsdToBs).toFixed(2)) : 0);
        const itemCostBs = item.product.costBs || item.product.costPrice || 0;
        const itemCostUsd = item.product.costUsd || (exchangeRateUsdToBs > 0 ? Number((itemCostBs / exchangeRateUsdToBs).toFixed(2)) : 0);

        return {
          productId: item.product.id,
          name: item.product.name,
          barcode: item.product.barcode,
          quantity: item.quantity,
          unitPriceBs: itemPriceBs,
          unitPriceUsd: itemPriceUsd,
          totalBs: itemPriceBs * item.quantity,
          totalUsd: itemPriceUsd * item.quantity,
          unitCostBs: itemCostBs,
          unitCostUsd: itemCostUsd,

          // Legacy fields
          unitPriceBase: itemPriceBs,
          totalBase: itemPriceBs * item.quantity,
          unitCostBase: itemCostBs,
        };
      });

      // Generate receipt number
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timePart = Math.floor(1000 + Math.random() * 9000);
      const receiptNumber = `TICK-${datePart}-${timePart}`;

      const sale: Sale = {
        id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        receiptNumber,
        sessionId: activeSessionId,
        items: saleItems,
        subtotalBs,
        discountBs: discountAmountBs,
        totalBs,
        totalUsd,
        exchangeRateAtSale: exchangeRateUsdToBs,

        // Legacy compatibility
        subtotalBase: subtotalBs,
        discountBase: discountAmountBs,
        totalBase: totalBs,
        currencyCode: paymentCurrency.code,
        currencySymbol: paymentCurrency.symbol,
        totalInCurrency,

        paymentMethod,
        amountTenderedInCurrency: tendered,
        changeGivenInCurrency,
        customerName: customerName?.trim() || undefined,
        customerDoc: customerDoc?.trim() || undefined,
        notes: notes?.trim() || undefined,
        timestamp: now.toISOString(),
      };

      // Save sale to persistent storage
      const existingSales = StorageService.getSales();
      const updatedSales = [sale, ...existingSales];
      StorageService.saveSales(updatedSales);

      // Async write to Firestore
      FirestoreService.saveSale(sale).catch((err) => {
        console.error('Error guardando venta en Firestore', err);
      });

      // Deduct stock from products & record stock adjustments: (-)vendido
      const existingAdjustments = StorageService.getAdjustments();
      const saleAdjustments: StockAdjustment[] = [];

      const updatedProducts = products.map((prod) => {
        const inCart = cart.find((item) => item.product.id === prod.id);
        if (inCart) {
          const prevStock = prod.stock;
          const newStock = Math.max(0, prevStock - inCart.quantity);

          const saleAdj: StockAdjustment = {
            id: `adj_${Date.now()}_${saleAdjustments.length}_${Math.random().toString(36).substring(2, 6)}`,
            productId: prod.id,
            productName: prod.name,
            type: 'out',
            quantity: inCart.quantity,
            reason: 'Vendido',
            description: `Venta #${sale.receiptNumber}`,
            previousStock: prevStock,
            newStock,
            timestamp: now.toISOString(),
          };

          saleAdjustments.push(saleAdj);

          return {
            ...prod,
            stock: newStock,
            movements: [saleAdj, ...(prod.movements || [])],
            updatedAt: now.toISOString(),
          };
        }
        return prod;
      });

      if (saleAdjustments.length > 0) {
        const nextAdjustments = [...saleAdjustments, ...existingAdjustments];
        StorageService.saveAdjustments(nextAdjustments);
      }

      onStockDeducted(updatedProducts);
      StorageService.saveProducts(updatedProducts);

      // Clear cart & set last completed sale
      clearCart();
      setLastCompletedSale(sale);

      return { success: true, sale };
    },
    [
      cart,
      totalBs,
      totalUsd,
      subtotalBs,
      discountAmountBs,
      exchangeRateUsdToBs,
      activeSessionId,
      products,
      onStockDeducted,
      clearCart,
    ]
  );

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    discountPercent,
    setDiscountPercent,
    subtotalBs,
    discountAmountBs,
    totalBs,
    totalUsd,
    // backwards-compat aliases:
    subtotalBase: subtotalBs,
    discountAmountBase: discountAmountBs,
    totalBase: totalBs,
    totalItemsCount,
    completeSale,
    lastCompletedSale,
    setLastCompletedSale,
  };
}
