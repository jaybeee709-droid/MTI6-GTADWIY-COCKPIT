/* Behavioural test for the CockpitDB Option A fix (js/db.js).
 * Mocks indexedDB at the boundary the file actually uses:
 * open() -> request (onsuccess with a mock db), db.transaction()
 * -> { objectStore() } -> store.get() -> request (onsuccess).
 * Asserts: (1) a normal op works; (2) after the connection's
 * onclose fires, the NEXT op reopens (open called again) instead
 * of reusing the dead connection; (3) onversionchange closes the
 * db and likewise forces a reopen. */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let openCalls = 0;
const dbs = [];

function makeDb() {
  const db = {
    closed: false,
    onversionchange: null,
    onclose: null,
    close() { this.closed = true; },
    transaction() {
      if (this.closed) throw new Error('The database connection is closing');
      return {
        objectStore() {
          return {
            get() {
              const req = { result: undefined };
              queueMicrotask(() => req.onsuccess && req.onsuccess());
              return req;
            },
          };
        },
      };
    },
  };
  dbs.push(db);
  return db;
}

const fakeIndexedDB = {
  open() {
    openCalls += 1;
    const req = { result: makeDb() };
    queueMicrotask(() => req.onsuccess && req.onsuccess());
    return req;
  },
};

const sandbox = { window: {}, console, Promise, queueMicrotask };
sandbox.window.indexedDB = fakeIndexedDB;
sandbox.indexedDB = fakeIndexedDB;
vm.createContext(sandbox);
vm.runInContext(readFileSync(process.argv[2] || "js/db.js", 'utf8'), sandbox);
const DB = sandbox.window.CockpitDB;
if (!DB) throw new Error('CockpitDB not exported');

const results = [];
const check = (name, ok) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);

await DB.get('notes', 'x');
check('op 1 succeeds on first connection', openCalls === 1);

await DB.get('notes', 'x');
check('op 2 reuses the live connection (still 1 open)', openCalls === 1);

// Simulate the browser closing the connection (the diagnosed bug).
dbs[0].closed = true;
dbs[0].onclose && dbs[0].onclose();
await DB.get('notes', 'x');
check('op 3 after onclose reopens instead of throwing (2 opens)', openCalls === 2);

// Simulate a versionchange on the live connection.
const before = openCalls;
dbs[1].onversionchange && dbs[1].onversionchange();
check('onversionchange closed the db', dbs[1].closed === true);
await DB.get('notes', 'x');
check('op 4 after versionchange reopens (3 opens)', openCalls === before + 1);

console.log(results.join('\n'));
if (results.some((r) => r.startsWith('FAIL'))) process.exit(1);
console.log('DB FIX TEST: ALL PASS');
