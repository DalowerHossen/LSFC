"use client";

const DB = "lsfc-offline-v1";
const STORE = "queue";
const KEYS = "keys";
const KEY_ID = "application-key";
const DEVICE = "lsfc-device-id";
const allowed = ["clientRequestId", "serviceCode", "scanPageCount", "citizenName", "citizenMobile", "governmentFee", "consentReceived"] as const;

export type OfflineErrorCode = "SERVER_REJECTED" | "DECRYPTION_FAILED" | "DEVICE_MISMATCH";
export type OfflineQueueItem = {
  id: string;
  createdAt: string;
  status: "queued" | "failed";
  attemptCount: number;
  lastAttemptAt?: string;
  lastErrorCode?: OfflineErrorCode;
};
type RecordRow = OfflineQueueItem & { iv: ArrayBuffer; cipher: ArrayBuffer; deviceId: string };
type SubmissionResult = boolean | { success: boolean; errorCode?: OfflineErrorCode };

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(KEYS)) db.createObjectStore(KEYS);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
async function encryptionKey(db: IDBDatabase) {
  const existing = await requestResult(db.transaction(KEYS).objectStore(KEYS).get(KEY_ID)) as CryptoKey | undefined;
  if (existing) return existing;
  const value = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const transaction = db.transaction(KEYS, "readwrite");
  transaction.objectStore(KEYS).put(value, KEY_ID);
  await transactionDone(transaction);
  return value;
}
function deviceId() {
  let id = localStorage.getItem(DEVICE);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE, id);
  }
  return id;
}
async function allRows(db: IDBDatabase) {
  return await requestResult(db.transaction(STORE).objectStore(STORE).getAll()) as RecordRow[];
}
async function putRow(db: IDBDatabase, row: RecordRow) {
  const transaction = db.transaction(STORE, "readwrite");
  transaction.objectStore(STORE).put(row);
  await transactionDone(transaction);
}
async function deleteRow(db: IDBDatabase, id: string) {
  const transaction = db.transaction(STORE, "readwrite");
  transaction.objectStore(STORE).delete(id);
  await transactionDone(transaction);
}
function normalized(row: RecordRow): RecordRow {
  return { ...row, status: row.status ?? "queued", attemptCount: row.attemptCount ?? 0 };
}

export async function queueOfflineApplication(form: FormData) {
  const payload: Record<string, string> = {};
  for (const name of allowed) {
    const value = form.get(name);
    if (typeof value === "string") payload[name] = value;
  }
  const db = await open();
  const key = await encryptionKey(db);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const device = deviceId();
  const id = payload.clientRequestId || crypto.randomUUID();
  const encoded = new TextEncoder().encode(JSON.stringify({ deviceId: device, fields: payload }));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(id) }, key, encoded);
  await putRow(db, { id, iv: iv.buffer, cipher, createdAt: new Date().toISOString(), deviceId: device, status: "queued", attemptCount: 0 });
  return id;
}

export async function offlineQueueItems(): Promise<OfflineQueueItem[]> {
  const db = await open();
  return (await allRows(db)).map(normalized).map(({ id, createdAt, status, attemptCount, lastAttemptAt, lastErrorCode }) => ({ id, createdAt, status, attemptCount, lastAttemptAt, lastErrorCode })).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function offlineQueueCount() { return (await offlineQueueItems()).length; }

export async function retryOfflineApplication(id: string) {
  const db = await open();
  const row = await requestResult(db.transaction(STORE).objectStore(STORE).get(id)) as RecordRow | undefined;
  if (!row || row.deviceId !== deviceId()) throw new Error("Offline item unavailable");
  await putRow(db, { ...normalized(row), status: "queued", lastErrorCode: undefined });
}
export async function discardOfflineApplication(id: string) {
  const db = await open();
  const row = await requestResult(db.transaction(STORE).objectStore(STORE).get(id)) as RecordRow | undefined;
  if (!row) throw new Error("Offline item unavailable");
  await deleteRow(db, id);
}

export async function syncOfflineApplications(submit: (form: FormData) => Promise<SubmissionResult>) {
  const summary = { synced: 0, failed: 0 };
  if (!navigator.onLine) return summary;
  const db = await open();
  const key = await encryptionKey(db);
  const device = deviceId();
  for (const current of await allRows(db)) {
    const row = normalized(current);
    if (row.status !== "queued") continue;
    const attemptedAt = new Date().toISOString();
    if (row.deviceId !== device) {
      await putRow(db, { ...row, status: "failed", attemptCount: row.attemptCount + 1, lastAttemptAt: attemptedAt, lastErrorCode: "DEVICE_MISMATCH" });
      summary.failed++;
      continue;
    }
    let payloadReady = false;
    try {
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(row.iv), additionalData: new TextEncoder().encode(row.id) }, key, row.cipher);
      const parsed = JSON.parse(new TextDecoder().decode(plain)) as { deviceId: string; fields: Record<string, string> };
      if (parsed.deviceId !== device) throw new Error("DEVICE_MISMATCH");
      payloadReady = true;
      const form = new FormData();
      for (const [name, value] of Object.entries(parsed.fields)) if ((allowed as readonly string[]).includes(name)) form.set(name, value);
      const response = await submit(form);
      const result = typeof response === "boolean" ? { success: response } : response;
      if (result.success) {
        await deleteRow(db, row.id);
        summary.synced++;
      } else {
        await putRow(db, { ...row, status: "failed", attemptCount: row.attemptCount + 1, lastAttemptAt: attemptedAt, lastErrorCode: result.errorCode ?? "SERVER_REJECTED" });
        summary.failed++;
      }
    } catch (error) {
      const code: OfflineErrorCode = error instanceof Error && error.message === "DEVICE_MISMATCH" ? "DEVICE_MISMATCH" : payloadReady ? "SERVER_REJECTED" : "DECRYPTION_FAILED";
      await putRow(db, { ...row, status: "failed", attemptCount: row.attemptCount + 1, lastAttemptAt: attemptedAt, lastErrorCode: code });
      summary.failed++;
    }
  }
  return summary;
}
