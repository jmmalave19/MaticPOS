import { Product, StockAdjustment } from '../models/product.model';
import { Sale } from '../models/sale.model';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../models/settings.model';
import { WorkDaySession } from '../models/session.model';
import { CurrencyConfig, DEFAULT_CURRENCIES } from '../models/currency.model';

const STORAGE_KEYS = {
  PRODUCTS: 'stockventa_products_v2',
  SALES: 'stockventa_sales_v2',
  ADJUSTMENTS: 'stockventa_adjustments_v2',
  SETTINGS: 'stockventa_settings_v2',
  SESSIONS: 'stockventa_sessions_v2',
  ACTIVE_SESSION: 'stockventa_active_session_v2',
  CURRENCY_CONFIG: 'stockventa_currency_config_v2',
} as const;

export class StorageService {
  private static isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  // --- PRODUCTS ---
  static getProducts(): Product[] {
    if (!this.isBrowser()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error cargando productos', e);
      return [];
    }
  }

  static saveProducts(products: Product[]): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Error guardando productos', e);
    }
  }

  // --- SALES ---
  static getSales(): Sale[] {
    if (!this.isBrowser()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error cargando ventas', e);
      return [];
    }
  }

  static saveSales(sales: Sale[]): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    } catch (e) {
      console.error('Error guardando ventas', e);
    }
  }

  // --- ADJUSTMENTS ---
  static getAdjustments(): StockAdjustment[] {
    if (!this.isBrowser()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error cargando ajustes', e);
      return [];
    }
  }

  static saveAdjustments(adjustments: StockAdjustment[]): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(adjustments));
    } catch (e) {
      console.error('Error guardando ajustes', e);
    }
  }

  // --- APP SETTINGS (Exchange rate & commission) ---
  static getSettings(): AppSettings {
    if (!this.isBrowser()) return DEFAULT_APP_SETTINGS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_APP_SETTINGS;
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_APP_SETTINGS,
        ...parsed,
        commission: {
          ...DEFAULT_APP_SETTINGS.commission,
          ...(parsed.commission || {}),
        },
      };
    } catch (e) {
      console.error('Error cargando ajustes', e);
      return DEFAULT_APP_SETTINGS;
    }
  }

  static saveSettings(settings: AppSettings): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error guardando ajustes', e);
    }
  }

  // --- CURRENCY CONFIG (Multicurrency) ---
  static getCurrencyConfig(): CurrencyConfig {
    const defaultConfig: CurrencyConfig = {
      baseCurrencyCode: 'VES',
      activeDisplayCurrencyCode: 'VES',
      currencies: DEFAULT_CURRENCIES,
      lastUpdated: new Date().toISOString(),
    };

    if (!this.isBrowser()) return defaultConfig;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENCY_CONFIG);
      if (!data) return defaultConfig;
      const parsed = JSON.parse(data);
      return {
        ...defaultConfig,
        ...parsed,
      };
    } catch (e) {
      console.error('Error cargando configuración de monedas', e);
      return defaultConfig;
    }
  }

  static saveCurrencyConfig(config: CurrencyConfig): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENCY_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Error guardando configuración de monedas', e);
    }
  }

  // --- WORK DAY SESSIONS ---
  static getSessions(): WorkDaySession[] {
    if (!this.isBrowser()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (!data) return [];
      const list: WorkDaySession[] = JSON.parse(data);
      if (!Array.isArray(list)) return [];
      const seen = new Set<string>();
      return list.filter((s) => {
        if (!s || !s.id || seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
    } catch (e) {
      console.error('Error cargando sesiones', e);
      return [];
    }
  }

  static saveSessions(sessions: WorkDaySession[]): void {
    if (!this.isBrowser()) return;
    try {
      const seen = new Set<string>();
      const unique = sessions.filter((s) => {
        if (!s || !s.id || seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(unique));
    } catch (e) {
      console.error('Error guardando sesiones', e);
    }
  }

  static getActiveSession(): WorkDaySession | null {
    if (!this.isBrowser()) return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error cargando sesión activa', e);
      return null;
    }
  }

  static saveActiveSession(session: WorkDaySession | null): void {
    if (!this.isBrowser()) return;
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      }
    } catch (e) {
      console.error('Error guardando sesión activa', e);
    }
  }

  // --- EXPORT & IMPORT BACKUP ---
  static exportFullBackup(): string {
    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      products: this.getProducts(),
      sales: this.getSales(),
      adjustments: this.getAdjustments(),
      settings: this.getSettings(),
      sessions: this.getSessions(),
      activeSession: this.getActiveSession(),
    };
    return JSON.stringify(backup, null, 2);
  }

  static importFullBackup(jsonContent: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonContent);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'El archivo JSON no tiene un formato válido.' };
      }

      if (Array.isArray(data.products)) this.saveProducts(data.products);
      if (Array.isArray(data.sales)) this.saveSales(data.sales);
      if (Array.isArray(data.adjustments)) this.saveAdjustments(data.adjustments);
      if (data.settings) this.saveSettings(data.settings);
      if (Array.isArray(data.sessions)) this.saveSessions(data.sessions);
      if (data.activeSession !== undefined) this.saveActiveSession(data.activeSession);

      return { success: true, message: 'Copia de seguridad restaurada correctamente.' };
    } catch (e) {
      return { success: false, message: 'Error al procesar la copia de seguridad.' };
    }
  }
}
