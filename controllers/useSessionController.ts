'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorkDaySession } from '../models/session.model';
import { Sale } from '../models/sale.model';
import { AppSettings } from '../models/settings.model';
import { StorageService } from '../services/storage.service';
import { FirestoreService } from '../services/firestore.service';

export function useSessionController(settings: AppSettings) {
  const [activeSession, setActiveSession] = useState<WorkDaySession | null>(() =>
    StorageService.getActiveSession()
  );
  const [sessions, setSessions] = useState<WorkDaySession[]>(() =>
    StorageService.getSessions()
  );

  // Real-time Firestore sync
  useEffect(() => {
    const unsub = FirestoreService.subscribeToSessions(
      (remoteSessions) => {
        // Garantizar unicidad de IDs de sesiones
        const unique = remoteSessions.filter(
          (s, idx, self) => idx === self.findIndex((t) => t.id === s.id)
        );
        setSessions(unique);
        // Look for open session
        const open = unique.find((s) => s.status === 'open') || null;
        if (open) {
          setActiveSession(open);
          StorageService.saveActiveSession(open);
        }
      },
      (err) => {
        console.warn('Firestore sessions fallback:', err);
      }
    );
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Iniciar Día (Apertura de jornada)
  const openDay = useCallback(
    (initialCashBs: number = 0, initialCashUsd: number = 0): { success: boolean; session?: WorkDaySession; error?: string } => {
      if (activeSession && activeSession.status === 'open') {
        return { success: false, error: 'Ya existe una jornada iniciada actualmente.' };
      }

      const now = new Date();
      const newSession: WorkDaySession = {
        id: `session_${Date.now()}`,
        status: 'open',
        dateString: now.toISOString().slice(0, 10),
        openedAt: now.toISOString(),
        initialCashBs: Math.max(0, initialCashBs),
        initialCashUsd: Math.max(0, initialCashUsd),
      };

      setActiveSession(newSession);
      StorageService.saveActiveSession(newSession);

      setSessions((prev) => [newSession, ...prev.filter((s) => s.id !== newSession.id)]);

      FirestoreService.saveSession(newSession).catch((err) => {
        console.error('Error guardando jornada en Firestore', err);
      });

      return { success: true, session: newSession };
    },
    [activeSession]
  );

  // Finalizar Día (Cierre de jornada)
  const closeDay = useCallback(
    (params: { sales: Sale[]; closingNotes?: string }): { success: boolean; closedSession?: WorkDaySession; error?: string } => {
      if (!activeSession || activeSession.status !== 'open') {
        return { success: false, error: 'No hay ninguna jornada activa para finalizar.' };
      }

      const { sales, closingNotes } = params;

      // Filter sales belonging to this session
      const sessionSales = sales.filter(
        (s) =>
          s.sessionId === activeSession.id ||
          (s.timestamp >= activeSession.openedAt && (!s.sessionId || s.sessionId === activeSession.id))
      );

      let totalSalesBs = 0;
      let totalSalesUsd = 0;
      let totalCostBs = 0;
      let totalCostUsd = 0;

      const breakdown = {
        efectivoBs: 0,
        efectivoUsd: 0,
        divisaBs: 0,
        divisaUsd: 0,
        tarjetaBs: 0,
        tarjetaUsd: 0,
        pagoMovilBs: 0,
        pagoMovilUsd: 0,
        biopagoBs: 0,
        biopagoUsd: 0,
        transferenciaBs: 0,
        otroBs: 0,
      };

      for (const sale of sessionSales) {
        totalSalesBs += sale.totalBs;
        totalSalesUsd += sale.totalUsd;

        for (const item of sale.items) {
          totalCostBs += (item.unitCostBs || 0) * item.quantity;
          totalCostUsd += (item.unitCostUsd || 0) * item.quantity;
        }

        // Breakdown by payment method
        if (sale.paymentMethod === 'efectivo') {
          breakdown.efectivoBs += sale.totalBs;
          breakdown.efectivoUsd += sale.totalUsd;
        } else if (sale.paymentMethod === 'divisa') {
          breakdown.divisaBs += sale.totalBs;
          breakdown.divisaUsd += sale.totalUsd;
        } else if (sale.paymentMethod === 'pago_movil') {
          breakdown.pagoMovilBs += sale.totalBs;
          breakdown.pagoMovilUsd += sale.totalUsd;
        } else if (sale.paymentMethod === 'tarjeta') {
          breakdown.tarjetaBs += sale.totalBs;
          breakdown.tarjetaUsd += sale.totalUsd;
        } else if (sale.paymentMethod === 'biopago') {
          breakdown.biopagoBs += sale.totalBs;
          breakdown.biopagoUsd += sale.totalUsd;
        } else if (sale.paymentMethod === 'transferencia') {
          breakdown.transferenciaBs += sale.totalBs;
        } else {
          breakdown.otroBs += sale.totalBs;
        }
      }

      const grossProfitBs = Math.max(0, totalSalesBs - totalCostBs);
      const grossProfitUsd = Math.max(0, totalSalesUsd - totalCostUsd);

      // Commission calculation based on settings
      let commissionBs = 0;
      let commissionUsd = 0;
      if (settings.commission.enabled && settings.commission.ratePercent > 0) {
        const factor = settings.commission.ratePercent / 100;
        if (settings.commission.target === 'total_sales') {
          commissionBs = Number((totalSalesBs * factor).toFixed(2));
          commissionUsd = Number((totalSalesUsd * factor).toFixed(2));
        } else {
          // 'gross_profit'
          commissionBs = Number((grossProfitBs * factor).toFixed(2));
          commissionUsd = Number((grossProfitUsd * factor).toFixed(2));
        }
      }

      const closedSession: WorkDaySession = {
        ...activeSession,
        status: 'closed',
        closedAt: new Date().toISOString(),
        closingNotes: closingNotes?.trim() ? closingNotes.trim() : '',
        totalSalesCount: sessionSales.length,
        totalSalesBs,
        totalSalesUsd,
        grossProfitBs,
        grossProfitUsd,
        commissionBs,
        commissionUsd,
        breakdown,
        expectedCashBs: activeSession.initialCashBs + breakdown.efectivoBs,
        expectedCashUsd: activeSession.initialCashUsd + breakdown.efectivoUsd,
      };

      // Reemplazar la sesión existente sin duplicar el ID en la lista
      const nextSessions = [
        closedSession,
        ...sessions.filter((s) => s.id !== closedSession.id),
      ];
      setSessions(nextSessions);
      StorageService.saveSessions(nextSessions);

      setActiveSession(null);
      StorageService.saveActiveSession(null);

      FirestoreService.saveSession(closedSession).catch((err) => {
        console.error('Error guardando cierre en Firestore', err);
      });

      return { success: true, closedSession };
    },
    [activeSession, sessions, settings]
  );

  const reloadSessions = useCallback(() => {
    setActiveSession(StorageService.getActiveSession());
    setSessions(StorageService.getSessions());
  }, []);

  return {
    activeSession,
    isDayOpen: !!activeSession && activeSession.status === 'open',
    sessions,
    openDay,
    closeDay,
    reloadSessions,
  };
}
