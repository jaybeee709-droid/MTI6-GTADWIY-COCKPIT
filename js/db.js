/* MTI6-GTADWIY-COCKPIT — IndexedDB data layer
 * No external dependencies. Pure browser-native IndexedDB.
 * All data stays on-device. No network calls are ever made by this file.
 */
(function (global) {
  "use strict";

  const DB_NAME = "mti6_gtadwiy_cockpit";
  // v2 adds the "archived" index on notes (Research Archive) and the "kind"
  // index on expenses (Resource Tracker asset/purchase tracking). Existing
  // installs upgrade in place — onupgradeneeded below adds the new indexes
  // to the stores that already exist rather than recreating them, so no
  // existing data is touched.
  // v3 adds ONLY the "cryptoWorld" store (Crypto World registry foundation,
  // Part 1). The upgrade loop below creates stores that do not exist yet
  // and never deletes or recreates an existing store, so all v2 data
  // survives the upgrade untouched.
  const DB_VERSION = 3;

  const STORES = {
    notes: "id",
    tasks: "id",
    expenses: "id",
    projects: "id",
    milestones: "id",
    activity: "id",
    settings: "key",
    widgets: "id",
    cryptoWorld: "id"
  };

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      function ensureIndex(store, name, keyPath) {
        if (!store.indexNames.contains(name)) {
          store.createIndex(name, keyPath, { unique: false });
        }
      }

      req.onupgradeneeded = (event) => {
        const db = req.result;
        const tx = req.transaction;

        Object.keys(STORES).forEach((storeName) => {
          const store = db.objectStoreNames.contains(storeName)
            ? tx.objectStore(storeName)
            : db.createObjectStore(storeName, { keyPath: STORES[storeName] });

          if (storeName === "notes") {
            ensureIndex(store, "category", "category");
            ensureIndex(store, "pinned", "pinned");
            ensureIndex(store, "updatedAt", "updatedAt");
            ensureIndex(store, "archived", "archived"); // v2: Research Archive
          }
          if (storeName === "tasks") {
            ensureIndex(store, "status", "status");
            ensureIndex(store, "priority", "priority");
            ensureIndex(store, "dueDate", "dueDate");
          }
          if (storeName === "expenses") {
            ensureIndex(store, "category", "category");
            ensureIndex(store, "date", "date");
            ensureIndex(store, "monthKey", "monthKey");
            ensureIndex(store, "kind", "kind"); // v2: Resource Tracker asset/purchase kind
          }
          if (storeName === "projects") {
            ensureIndex(store, "status", "status");
          }
          if (storeName === "milestones") {
            ensureIndex(store, "projectId", "projectId");
          }
          if (storeName === "activity") {
            ensureIndex(store, "timestamp", "timestamp");
          }
        });
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => console.warn("DB upgrade blocked — close other tabs of this app.");
    });
    return dbPromise;
  }

  function tx(storeName, mode) {
    return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
  }

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  const DB = {
    uuid,

    async put(storeName, record) {
      const store = await tx(storeName, "readwrite");
      await reqToPromise(store.put(record));
      return record;
    },

    async get(storeName, key) {
      const store = await tx(storeName, "readonly");
      return reqToPromise(store.get(key));
    },

    async getAll(storeName) {
      const store = await tx(storeName, "readonly");
      return reqToPromise(store.getAll());
    },

    async delete(storeName, key) {
      const store = await tx(storeName, "readwrite");
      await reqToPromise(store.delete(key));
      return true;
    },

    async clear(storeName) {
      const store = await tx(storeName, "readwrite");
      await reqToPromise(store.clear());
      return true;
    },

    async clearAll({ preserve = [] } = {}) {
      for (const name of Object.keys(STORES)) {
        if (preserve.includes(name)) continue;
        await this.clear(name);
      }
      return true;
    },

    async exportAll() {
      const data = {};
      for (const name of Object.keys(STORES)) {
        data[name] = await this.getAll(name);
      }
      data.__meta = {
        app: "MTI6-GTADWIY-COCKPIT",
        version: DB_VERSION,
        exportedAt: new Date().toISOString()
      };
      return data;
    },

    async importAll(data, { merge = false } = {}) {
      if (!data || typeof data !== "object") throw new Error("Invalid backup payload");
      // Backup-restore integrity wrapper (Batch B pre-import gate, U5):
      // restored cryptoWorld records must pass the same structural
      // guarantees as the loader gate BEFORE anything is written. The
      // candidate is validated against the complete candidate view —
      // existing store records (merge mode) or the candidate alone
      // (replace mode, since the store is cleared first) — so a restore
      // that reintroduces a parent and its child together passes, while
      // a restore with an orphan fails as a whole. On failure NOTHING is
      // written (no store is cleared, no record is restored): the whole
      // restore is rejected and the caller reports the failure, rather
      // than silently dropping only the bad record and restoring the
      // remainder with broken relationships. Unrelated stores are never
      // touched on a rejected restore. GENERAL cryptoWorld integrity
      // rules apply here — Batch B import-contract fields (importBatch,
      // ownerApprovalStatus, workspace/globeView, strategyKind) are NOT
      // required, so valid historical user data restores unchanged.
      // If the CryptoWorld validation layer is not loaded, there is
      // nothing to validate against and the legacy raw path runs (the
      // app cannot validate without its validator); in the shipped app
      // crypto-world.js always loads before any restore can run.
      if (Array.isArray(data.cryptoWorld) && data.cryptoWorld.length) {
        const CW = global.CryptoWorld;
        if (CW && typeof CW.validateCryptoWorldCandidate === "function") {
          let existingCrypto = [];
          try { existingCrypto = await this.getAll("cryptoWorld"); } catch (e) { existingCrypto = []; }
          const problems = CW.validateCryptoWorldCandidate(data.cryptoWorld, merge ? existingCrypto : []);
          if (problems.length) {
            const shown = problems.slice(0, 5).map((p) => p.id + ": " + p.reasons.join(" ")).join("; ");
            throw new Error("Backup restore blocked: invalid cryptoWorld content (" + problems.length + " record(s)) — " + shown);
          }
        }
      }
      for (const name of Object.keys(STORES)) {
        if (!Array.isArray(data[name])) continue;
        if (!merge) await this.clear(name);
        const store = await tx(name, "readwrite");
        for (const record of data[name]) {
          store.put(record);
        }
      }
      return true;
    },

    async logActivity(type, message, refId) {
      const record = {
        id: uuid(),
        type,
        message,
        refId: refId || null,
        timestamp: new Date().toISOString()
      };
      await this.put("activity", record);
      // keep activity log bounded to the most recent 200 entries
      const all = await this.getAll("activity");
      if (all.length > 200) {
        all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const toRemove = all.slice(0, all.length - 200);
        for (const r of toRemove) await this.delete("activity", r.id);
      }
      return record;
    }
  };

  global.CockpitDB = DB;
})(window);
