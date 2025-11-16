import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const init = () => {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY || !FIREBASE_DATABASE_URL) return null;
  if (getApps().length === 0) {
    const pk = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    initializeApp({
      credential: cert({ projectId: FIREBASE_PROJECT_ID, clientEmail: FIREBASE_CLIENT_EMAIL, privateKey: pk }),
      databaseURL: FIREBASE_DATABASE_URL,
    });
  }
  return getDatabase();
};

export const publishInventoryVersion = async () => {
  const db = init();
  if (!db) return { skipped: true };
  const r = db.ref('versions/inventory');
  return r.set(Date.now());
};

export const publishTransactionsVersion = async () => {
  const db = init();
  if (!db) return { skipped: true };
  const r = db.ref('versions/transactions');
  return r.set(Date.now());
};

export const publishProductSnapshot = async (product) => {
  const db = init();
  if (!db || !product || !product.id) return { skipped: true };
  const r = db.ref(`products/${product.id}`);
  return r.set({ id: product.id, name: product.name, sku: product.sku, category: product.category, price: product.price, stock: product.stock, updatedAt: new Date().toISOString() });
};

export const publishTransactionEvent = async (txn) => {
  const db = init();
  if (!db || !txn || !txn.id) return { skipped: true };
  const r = db.ref(`transactions/${txn.id}`);
  return r.set({ id: txn.id, total: txn.total, timestamp: new Date(txn.timestamp || Date.now()).toISOString() });
};
