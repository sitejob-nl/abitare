/**
 * IndexedDB-based offline mutation queue for PWA.
 * Stores mutations locally when offline and replays them when connectivity returns.
 */

const DB_NAME = "abitare-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "mutations";

export interface OfflineMutation {
  id: string;
  table: string;
  operation: "insert" | "update" | "upsert";
  data: Record<string, unknown>;
  matchColumn?: string; // for upsert/update
  matchValue?: string;
  createdAt: string;
  retries: number;
  status: "pending" | "processing" | "conflict" | "failed";
  errorMessage?: string;
  serverVersion?: Record<string, unknown>; // for conflict resolution
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addToQueue(mutation: Omit<OfflineMutation, "id" | "createdAt" | "retries" | "status">): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();
  const entry: OfflineMutation = {
    ...mutation,
    id,
    createdAt: new Date().toISOString(),
    retries: 0,
    status: "pending",
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(entry);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingMutations(): Promise<OfflineMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const index = tx.objectStore(STORE_NAME).index("status");
    const request = index.getAll("pending");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllMutations(): Promise<OfflineMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateMutationStatus(
  id: string,
  status: OfflineMutation["status"],
  extra?: Partial<OfflineMutation>
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result;
      if (entry) {
        store.put({ ...entry, status, ...extra });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeMutation(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearCompleted(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        if (cursor.value.status !== "pending" && cursor.value.status !== "processing") {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function getQueueCount(): Promise<number> {
  return getPendingMutations().then(m => m.length);
}
