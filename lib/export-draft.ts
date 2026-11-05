const DB_NAME = 'sticker-export-db';
const DB_VERSION = 1;
const STORE_NAME = 'export-drafts';
const DRAFT_KEY = 'current';

export type ExportDraft = {
  orderId: string;
  file: File;

  rows: number;
  cols: number;

  vLines: number[];
  hLines: number[];

  isCustom: boolean;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION,
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveExportDraft(
  draft: ExportDraft,
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      'readwrite',
    );

    const store =
      transaction.objectStore(STORE_NAME);

    store.put(draft, DRAFT_KEY);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function loadExportDraft():
  Promise<ExportDraft | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      'readonly',
    );

    const store =
      transaction.objectStore(STORE_NAME);

    const request =
      store.get(DRAFT_KEY);

    request.onsuccess = () => {
      db.close();

      resolve(
        (request.result as ExportDraft | undefined) ??
          null,
      );
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function clearExportDraft():
  Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      'readwrite',
    );

    const store =
      transaction.objectStore(STORE_NAME);

    store.delete(DRAFT_KEY);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}