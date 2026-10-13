import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product } from '../models/product.model';
import { Sale } from '../models/sale.model';
import { WorkDaySession } from '../models/session.model';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../models/settings.model';
import { StorageService } from './storage.service';

/**
 * Sanitiza recursivamente cualquier objeto para Firestore, eliminando valores `undefined`
 * que de lo contrario causan "Unsupported field value: undefined" en Firestore.
 */
function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return data;
}

export class FirestoreService {
  // --- PRODUCTS ---
  static subscribeToProducts(
    onData: (products: Product[]) => void,
    onError?: (err: Error) => void
  ) {
    const colPath = 'products';
    try {
      const colRef = collection(db, colPath);
      return onSnapshot(
        colRef,
        (snapshot) => {
          const list: Product[] = [];
          const seen = new Set<string>();
          snapshot.forEach((docSnap) => {
            const p = docSnap.data() as Product;
            if (p && p.id && !seen.has(p.id)) {
              seen.add(p.id);
              list.push(p);
            }
          });
          // Cache in local storage for instant offline availability
          StorageService.saveProducts(list);
          onData(list);
        },
        (error) => {
          if (onError) onError(error);
          handleFirestoreError(error, OperationType.GET, colPath);
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, colPath);
    }
  }

  static async saveProduct(product: Product): Promise<void> {
    const docPath = `products/${product.id}`;
    try {
      const docRef = doc(db, 'products', product.id);
      await setDoc(docRef, cleanForFirestore(product), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }

  static async deleteProduct(productId: string): Promise<void> {
    const docPath = `products/${productId}`;
    try {
      const docRef = doc(db, 'products', productId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }

  // --- SALES ---
  static subscribeToSales(
    onData: (sales: Sale[]) => void,
    onError?: (err: Error) => void
  ) {
    const colPath = 'sales';
    try {
      const colRef = collection(db, colPath);
      return onSnapshot(
        colRef,
        (snapshot) => {
          const list: Sale[] = [];
          const seen = new Set<string>();
          snapshot.forEach((docSnap) => {
            const s = docSnap.data() as Sale;
            if (s && s.id && !seen.has(s.id)) {
              seen.add(s.id);
              list.push(s);
            }
          });
          // Sort newest first
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          StorageService.saveSales(list);
          onData(list);
        },
        (error) => {
          if (onError) onError(error);
          handleFirestoreError(error, OperationType.GET, colPath);
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, colPath);
    }
  }

  static async saveSale(sale: Sale): Promise<void> {
    const docPath = `sales/${sale.id}`;
    try {
      const docRef = doc(db, 'sales', sale.id);
      await setDoc(docRef, cleanForFirestore(sale));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }

  static async deleteSale(saleId: string): Promise<void> {
    const docPath = `sales/${saleId}`;
    try {
      const docRef = doc(db, 'sales', saleId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }

  // --- SESSIONS ---
  static subscribeToSessions(
    onData: (sessions: WorkDaySession[]) => void,
    onError?: (err: Error) => void
  ) {
    const colPath = 'sessions';
    try {
      const colRef = collection(db, colPath);
      return onSnapshot(
        colRef,
        (snapshot) => {
          const list: WorkDaySession[] = [];
          const seen = new Set<string>();
          snapshot.forEach((docSnap) => {
            const sess = docSnap.data() as WorkDaySession;
            if (sess && sess.id && !seen.has(sess.id)) {
              seen.add(sess.id);
              list.push(sess);
            }
          });
          list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
          StorageService.saveSessions(list);
          onData(list);
        },
        (error) => {
          if (onError) onError(error);
          handleFirestoreError(error, OperationType.GET, colPath);
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, colPath);
    }
  }

  static async saveSession(session: WorkDaySession): Promise<void> {
    const docPath = `sessions/${session.id}`;
    try {
      const docRef = doc(db, 'sessions', session.id);
      await setDoc(docRef, cleanForFirestore(session), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }

  // --- SETTINGS ---
  static subscribeToSettings(
    onData: (settings: AppSettings) => void,
    onError?: (err: Error) => void
  ) {
    const docPath = 'settings/app_settings';
    try {
      const docRef = doc(db, 'settings', 'app_settings');
      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as AppSettings;
            StorageService.saveSettings(data);
            onData(data);
          }
        },
        (error) => {
          if (onError) onError(error);
          handleFirestoreError(error, OperationType.GET, docPath);
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    const docPath = 'settings/app_settings';
    try {
      const docRef = doc(db, 'settings', 'app_settings');
      await setDoc(docRef, cleanForFirestore(settings), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }
}
