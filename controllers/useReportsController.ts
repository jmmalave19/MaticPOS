'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sale, PAYMENT_METHOD_LABELS, PaymentMethod } from '../models/sale.model';
import { DailyReportSummary } from '../models/report.model';
import { StockAdjustment } from '../models/product.model';
import { AppSettings } from '../models/settings.model';
import { StorageService } from '../services/storage.service';
import { FirestoreService } from '../services/firestore.service';

export function useReportsController(settings: AppSettings) {
  const [sales, setSales] = useState<Sale[]>(() => StorageService.getSales());
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>(() =>
    StorageService.getAdjustments()
  );
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [isLoaded] = useState(true);

  // Real-time Firestore sync
  useEffect(() => {
    const unsub = FirestoreService.subscribeToSales(
      (remoteSales) => {
        setSales(remoteSales);
      },
      (err) => {
        console.warn('Firestore sales fallback:', err);
      }
    );
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const loadSales = useCallback(() => {
    const loadedSales = StorageService.getSales();
    const loadedAdjustments = StorageService.getAdjustments();
    setSales(loadedSales);
    setAdjustments(loadedAdjustments);
  }, []);

  // Filter sales for the selected date (YYYY-MM-DD)
  const dailySales = useMemo(() => {
    return sales.filter((s) => {
      const saleDate = s.timestamp.slice(0, 10);
      return saleDate === selectedDate;
    });
  }, [sales, selectedDate]);

  // Filter stock adjustments for the selected date (YYYY-MM-DD)
  const dailyAdjustments = useMemo(() => {
    return adjustments.filter((adj) => {
      const adjDate = adj.timestamp.slice(0, 10);
      return adjDate === selectedDate;
    });
  }, [adjustments, selectedDate]);

  // Calculate detailed daily summary with commission
  const dailySummary: DailyReportSummary = useMemo(() => {
    let totalRevenueBs = 0;
    let totalRevenueUsd = 0;
    let totalCostBs = 0;
    let totalCostUsd = 0;
    let totalItemsSold = 0;

    const paymentCounts: Record<PaymentMethod, { count: number; totalBs: number; totalUsd: number }> = {
      efectivo: { count: 0, totalBs: 0, totalUsd: 0 },
      divisa: { count: 0, totalBs: 0, totalUsd: 0 },
      tarjeta: { count: 0, totalBs: 0, totalUsd: 0 },
      pago_movil: { count: 0, totalBs: 0, totalUsd: 0 },
      biopago: { count: 0, totalBs: 0, totalUsd: 0 },
      transferencia: { count: 0, totalBs: 0, totalUsd: 0 },
      otro: { count: 0, totalBs: 0, totalUsd: 0 },
    };

    const productSalesMap = new Map<
      string,
      { productId: string; name: string; quantity: number; revenueBs: number; revenueUsd: number }
    >();

    for (const sale of dailySales) {
      const sBs = sale.totalBs !== undefined ? sale.totalBs : sale.totalBase;
      const sUsd =
        sale.totalUsd !== undefined
          ? sale.totalUsd
          : settings.exchangeRateUsdToBs > 0
          ? Number((sBs / settings.exchangeRateUsdToBs).toFixed(2))
          : 0;

      totalRevenueBs += sBs;
      totalRevenueUsd += sUsd;

      // Payment method breakdown
      if (paymentCounts[sale.paymentMethod]) {
        paymentCounts[sale.paymentMethod].count += 1;
        paymentCounts[sale.paymentMethod].totalBs += sBs;
        paymentCounts[sale.paymentMethod].totalUsd += sUsd;
      }

      // Products breakdown
      for (const item of sale.items) {
        totalItemsSold += item.quantity;
        const itemCostBs = item.unitCostBs || item.unitCostBase || 0;
        const itemCostUsd =
          item.unitCostUsd ||
          (settings.exchangeRateUsdToBs > 0
            ? Number((itemCostBs / settings.exchangeRateUsdToBs).toFixed(2))
            : 0);

        totalCostBs += itemCostBs * item.quantity;
        totalCostUsd += itemCostUsd * item.quantity;

        const itemRevBs = item.totalBs || item.totalBase || 0;
        const itemRevUsd =
          item.totalUsd ||
          (settings.exchangeRateUsdToBs > 0
            ? Number((itemRevBs / settings.exchangeRateUsdToBs).toFixed(2))
            : 0);

        const existing = productSalesMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenueBs += itemRevBs;
          existing.revenueUsd += itemRevUsd;
        } else {
          productSalesMap.set(item.productId, {
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            revenueBs: itemRevBs,
            revenueUsd: itemRevUsd,
          });
        }
      }
    }

    const grossProfitBs = Math.max(0, totalRevenueBs - totalCostBs);
    const grossProfitUsd = Math.max(0, totalRevenueUsd - totalCostUsd);
    const profitMarginPercent =
      totalRevenueBs > 0 ? Number(((grossProfitBs / totalRevenueBs) * 100).toFixed(1)) : 0;

    // Commission calculation based on settings
    let commissionBs = 0;
    let commissionUsd = 0;
    const { commission } = settings;
    if (commission.enabled && commission.ratePercent > 0) {
      const factor = commission.ratePercent / 100;
      if (commission.target === 'total_sales') {
        commissionBs = Number((totalRevenueBs * factor).toFixed(2));
        commissionUsd = Number((totalRevenueUsd * factor).toFixed(2));
      } else {
        commissionBs = Number((grossProfitBs * factor).toFixed(2));
        commissionUsd = Number((grossProfitUsd * factor).toFixed(2));
      }
    }

    // Convert payment map to array with percentages
    const paymentMethodBreakdown = (Object.keys(paymentCounts) as PaymentMethod[])
      .map((method) => {
        const data = paymentCounts[method];
        const percentage =
          totalRevenueBs > 0 ? Number(((data.totalBs / totalRevenueBs) * 100).toFixed(1)) : 0;
        return {
          method,
          label: PAYMENT_METHOD_LABELS[method],
          count: data.count,
          totalBs: data.totalBs,
          totalUsd: data.totalUsd,
          totalBase: data.totalBs,
          percentage,
        };
      })
      .filter((item) => item.count > 0);

    // Top products
    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((p) => ({
        ...p,
        revenueBase: p.revenueBs,
      }));

    return {
      dateString: selectedDate,
      totalSalesCount: dailySales.length,
      totalItemsSold,
      totalRevenueBs,
      totalRevenueUsd,
      totalCostBs,
      totalCostUsd,
      grossProfitBs,
      grossProfitUsd,
      profitMarginPercent,
      commissionEnabled: commission.enabled,
      commissionPercent: commission.ratePercent,
      commissionTarget: commission.target,
      commissionBs,
      commissionUsd,
      totalRevenueBase: totalRevenueBs,
      totalCostBase: totalCostBs,
      grossProfitBase: grossProfitBs,
      paymentMethodBreakdown,
      topProducts,
      sales: dailySales,
      adjustments: dailyAdjustments,
    };
  }, [dailySales, dailyAdjustments, selectedDate, settings]);

  // Cancel/Refund a sale
  const cancelSale = useCallback(
    (
      saleId: string,
      onStockRestored?: (itemsToRestore: { productId: string; quantity: number }[]) => void
    ) => {
      const targetSale = sales.find((s) => s.id === saleId);
      if (!targetSale) return;

      const remainingSales = sales.filter((s) => s.id !== saleId);
      setSales(remainingSales);
      StorageService.saveSales(remainingSales);

      FirestoreService.deleteSale(saleId).catch((err) => {
        console.error('Error eliminando venta en Firestore', err);
      });

      if (onStockRestored) {
        onStockRestored(
          targetSale.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
        );
      }
    },
    [sales]
  );

  return {
    sales,
    dailySales,
    adjustments,
    dailyAdjustments,
    dailySummary,
    selectedDate,
    setSelectedDate,
    isLoaded,
    loadSales,
    cancelSale,
  };
}
