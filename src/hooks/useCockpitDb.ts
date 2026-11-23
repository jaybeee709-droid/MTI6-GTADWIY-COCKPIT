import { useEffect, useState } from 'react';

export type CockpitDbStatus = 'CONNECTED' | 'NO DATA' | 'DISCONNECTED';

export interface CockpitDbState {
  status: CockpitDbStatus;
  storeCount: number | null;
  error: string | null;
}

const DB_NAME = 'mti6_gtadwiy_cockpit';
const EXPECTED_VERSION = 3;

export function useCockpitDb(): CockpitDbState {
  const [state, setState] = useState<CockpitDbState>({
    status: 'DISCONNECTED',
    storeCount: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let dbInstance: IDBDatabase | null = null;

    const closeDb = () => {
      if (dbInstance) {
        try {
          dbInstance.close();
        } catch {
          // Ignore close errors during cleanup
        }
        dbInstance = null;
      }
    };

    const connectReadOnly = async () => {
      if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
        if (!cancelled) {
          setState({
            status: 'DISCONNECTED',
            storeCount: null,
            error: 'IndexedDB is unavailable in this environment.',
          });
        }
        return;
      }

      try {
        if (typeof indexedDB.databases === 'function') {
          const existingDbs = await indexedDB.databases();
          const targetDb = existingDbs.find((db) => db.name === DB_NAME);
          if (!targetDb) {
            if (!cancelled) {
              setState({
                status: 'NO DATA',
                storeCount: 0,
                error: null,
              });
            }
            return;
          }
        }

        const request = indexedDB.open(DB_NAME);

        request.onupgradeneeded = (event) => {
          // Read-only probe: never create or mutate schema (Store 878 / js/db.js / P3 ENTITY_CANDIDATE)
          const tx = request.transaction;
          if (tx) {
            tx.abort();
          }
          if (event.oldVersion === 0 && request.result) {
            request.result.close();
          }
          if (!cancelled) {
            setState({
              status: 'NO DATA',
              storeCount: 0,
              error: null,
            });
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          if (cancelled) {
            db.close();
            return;
          }

          dbInstance = db;
          db.onversionchange = () => {
            closeDb();
          };

          const count = db.objectStoreNames.length;
          if (count === 0) {
            setState({
              status: 'NO DATA',
              storeCount: 0,
              error: db.version !== EXPECTED_VERSION
                ? `Database version ${db.version} has no stores (expected v${EXPECTED_VERSION}).`
                : null,
            });
            return;
          }

          setState({
            status: 'CONNECTED',
            storeCount: count,
            error: db.version !== EXPECTED_VERSION
              ? `Connected to v${db.version} (expected v${EXPECTED_VERSION}).`
              : null,
          });
        };

        request.onerror = () => {
          if (cancelled) return;
          const errMsg = request.error?.message || 'Failed to open IndexedDB.';
          if (request.error?.name === 'AbortError') {
            setState({
              status: 'NO DATA',
              storeCount: 0,
              error: null,
            });
          } else {
            setState({
              status: 'DISCONNECTED',
              storeCount: null,
              error: errMsg,
            });
          }
        };

        request.onblocked = () => {
          if (!cancelled) {
            setState({
              status: 'DISCONNECTED',
              storeCount: null,
              error: 'IndexedDB connection blocked.',
            });
          }
        };
      } catch (err) {
        if (!cancelled) {
          setState({
            status: 'DISCONNECTED',
            storeCount: null,
            error: err instanceof Error ? err.message : 'Unknown IndexedDB error.',
          });
        }
      }
    };

    void connectReadOnly();

    return () => {
      cancelled = true;
      closeDb();
    };
  }, []);

  return state;
}
