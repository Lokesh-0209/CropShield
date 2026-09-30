import { openDB } from 'idb';

const DB_NAME = 'cropshield_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_reports';

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Save a report to IndexedDB queue when offline
 */
export async function saveOfflineReport(caseData) {
  try {
    const db = await getDB();
    const offlineId = `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const offlineCase = {
      id: offlineId,
      ...caseData,
      disease: 'Pending Online AI Diagnosis',
      confidence: 0,
      risk_level: 'MEDIUM',
      status: 'WAITING_SYNC',
      is_offline: true,
      created_at: new Date().toISOString(),
      officer_note: null,
    };

    await db.put(STORE_NAME, offlineCase);
    // Dispatch event so UI can immediately update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cropshield:offline-queue-changed'));
    }
    return offlineCase;
  } catch (err) {
    console.error('Failed to save offline report to IndexedDB:', err);
    // Fallback to localStorage if IndexedDB is blocked
    const fallbackId = `offline-${Date.now()}`;
    const offlineCase = {
      id: fallbackId,
      ...caseData,
      disease: 'Pending Online AI Diagnosis',
      status: 'WAITING_SYNC',
      is_offline: true,
      created_at: new Date().toISOString(),
    };
    try {
      const existing = JSON.parse(localStorage.getItem('cropshield_offline_backup') || '[]');
      existing.unshift(offlineCase);
      localStorage.setItem('cropshield_offline_backup', JSON.stringify(existing));
    } catch {
      // ignore
    }
    return offlineCase;
  }
}

/**
 * Get all queued offline reports
 */
export async function getQueuedReports() {
  try {
    const db = await getDB();
    const reports = await db.getAll(STORE_NAME);
    return reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (err) {
    console.warn('Failed to read IndexedDB offline queue:', err);
    try {
      return JSON.parse(localStorage.getItem('cropshield_offline_backup') || '[]');
    } catch {
      return [];
    }
  }
}

/**
 * Remove a report from the offline queue
 */
export async function removeQueuedReport(id) {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cropshield:offline-queue-changed'));
    }
  } catch (err) {
    console.warn('Failed to delete offline report:', err);
  }
}

/**
 * Synchronize all pending offline reports with the backend/mock service
 */
export async function syncOfflineReports(submitFn) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0, pending: (await getQueuedReports()).length };
  }

  const reports = await getQueuedReports();
  if (!reports || reports.length === 0) {
    return { synced: 0, failed: 0, pending: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const report of reports) {
    try {
      // Clean up local offline helper fields before sending
      const { id: _id, is_offline: _off, status: _st, ...payload } = report;
      await submitFn(payload);
      await removeQueuedReport(report.id);
      synced++;
    } catch (err) {
      console.error(`Failed to sync offline report ${report.id}:`, err);
      failed++;
    }
  }

  if (synced > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cropshield:sync-complete', {
        detail: { synced, failed },
      })
    );
  }

  return { synced, failed, pending: (await getQueuedReports()).length };
}

/**
 * Initialize background listeners for online auto-sync
 */
export function setupAutoSync(submitFn) {
  if (typeof window === 'undefined') return;

  const handleOnline = async () => {
    console.log('[CropShield] Internet connection restored. Auto-syncing queued reports...');
    await syncOfflineReports(submitFn);
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
