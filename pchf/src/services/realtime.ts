import { getApps, initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, Database } from 'firebase/database';

let dbInstance: Database | null = null;

const getEnv = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
});

const ensure = (): Database | null => {
  if (dbInstance) return dbInstance;
  const cfg = getEnv();
  const enabled = !!(cfg.apiKey && cfg.authDomain && cfg.databaseURL && cfg.projectId && cfg.appId);
  if (!enabled) return null;
  if (getApps().length === 0) {
    initializeApp({
      apiKey: cfg.apiKey!,
      authDomain: cfg.authDomain!,
      databaseURL: cfg.databaseURL!,
      projectId: cfg.projectId!,
      storageBucket: cfg.storageBucket,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId!,
    });
  }
  dbInstance = getDatabase();
  return dbInstance;
};

export const onInventoryVersion = (cb: () => void): (() => void) => {
  const db = ensure();
  if (!db) return () => {};
  const r = ref(db, 'versions/inventory');
  const off = onValue(r, () => cb());
  return () => off();
};

export const onTransactionsVersion = (cb: () => void): (() => void) => {
  const db = ensure();
  if (!db) return () => {};
  const r = ref(db, 'versions/transactions');
  const off = onValue(r, () => cb());
  return () => off();
};

export const onProduct = (productId: string, cb: (p: any) => void): (() => void) => {
  const db = ensure();
  if (!db || !productId) return () => {};
  const r = ref(db, `products/${productId}`);
  const off = onValue(r, (snap) => cb(snap.val()));
  return () => off();
};
