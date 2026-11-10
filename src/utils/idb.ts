import { StoredDocument } from '../types';

const DB_NAME = 'mrudugandha_vault_idb';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

/**
 * Opens or upgrades the IndexedDB database for large document storage
 */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Retrieves all stored documents from IndexedDB
 */
export async function getIdbDocuments(): Promise<StoredDocument[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve((req.result as StoredDocument[]) || []);
      };

      req.onerror = () => {
        reject(req.error || new Error('Failed to fetch from IndexedDB'));
      };
    });
  } catch {
    return [];
  }
}

/**
 * Saves or updates a list of documents in IndexedDB
 */
export async function saveIdbDocuments(docs: StoredDocument[]): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      docs.forEach(doc => {
        store.put(doc);
      });

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        reject(tx.error || new Error('Failed to save documents to IndexedDB'));
      };
    });
  } catch {
    // Fail gracefully
  }
}

/**
 * Saves a single document to IndexedDB
 */
export async function saveIdbDocument(doc: StoredDocument): Promise<void> {
  return saveIdbDocuments([doc]);
}

/**
 * Deletes a document by ID from IndexedDB
 */
export async function deleteIdbDocument(id: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => {
        resolve();
      };

      req.onerror = () => {
        reject(req.error || new Error('Failed to delete document from IndexedDB'));
      };
    });
  } catch {
    // Fail gracefully
  }
}
