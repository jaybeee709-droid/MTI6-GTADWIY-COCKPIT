# MTI6-GTADWIY — Architecture & Roadmap

**MTI6-GTADWIY** is a private, offline-first cockpit and command center. It runs as an
installable Progressive Web App (PWA) with no cloud dependency, no login, and no account —
every record is created, edited, and stored on the device itself. This document is the
architecture plan for **Phase 1: Foundation**, written before any further code changes in
this phase, per your request.

---

## 1. Complete Architecture Plan

### 1.1 Operating principles (non-negotiable across every phase)
- **Local-first.** IndexedDB is the single source of truth. No module may require a network
  call to function.
- **No account, no login.** There is nothing to authenticate — the device itself is the
  identity boundary.
- **One shared data layer.** Every module reads and writes through one object (`CockpitDB`),
  never opening its own IndexedDB connection. This is what keeps new modules from needing a
  redesign of the storage layer.
- **One shared UI kit.** Every module builds its screen with the same small DOM-building and
  UX helpers (`U` in `js/utils.js`) — buttons, modals, toasts, inline validation, loading
  states, skeletons, error panels. This is what keeps the app visually and behaviorally
  consistent as it grows.
- **One router, many modules.** `js/app.js` owns navigation, the sidebar, the install flow,
  and offline/update plumbing. A module never touches routing directly — it only exports a
  `render(root)` function.

### 1.2 High-level system diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         index.html (app shell)                       │
│   top bar · sidebar nav · offline indicator · <div id="view-root">   │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │
                         js/app.js (router)
            ┌───────────┬────────────┬────────────┬────────────┬─────────────┐
            ▼           ▼            ▼            ▼            ▼             ▼
      dashboard.js   vault.js     tasks.js    projects.js  expenses.js  settings.js
      (Cockpit       (Knowledge   (Mission    (Mission     (Resource    (Device Sync
       Dashboard)     Vault)      Control:     Control:     Tracker)     Prep: backup,
                                  Tasks)       Projects)                 theme, reset)
            │           │            │            │            │             │
            └───────────┴─────┬──────┴────────────┴────────────┴─────────────┘
                               ▼
                     js/db.js  (CockpitDB — IndexedDB)
                     js/backup.js (encrypted export/import, Web Crypto)
                     js/utils.js  (U — shared UI kit)
                               │
                               ▼
                     Browser's IndexedDB (on-device, per-origin, persistent)
```

### 1.3 Module naming map (your Phase 1 brief → implementation)

| Your module name            | Implemented as          | Status going into Phase 1  |
|------------------------------|--------------------------|------------------------------|
| MTI6 Cockpit Dashboard       | `js/modules/dashboard.js` | Exists — being extended now with Quick Actions and MTI6 framing |
| Knowledge Vault              | `js/modules/vault.js`     | Exists — being extended now with a Research Archive |
| Task and Mission Control     | `js/modules/tasks.js` + `js/modules/projects.js` | Exists as two linked modules (see §4) |
| Resource Tracker             | `js/modules/expenses.js`  | Exists as expense/monthly-summary tracking; asset/purchase fields added this phase |
| Device Sync Preparation      | `js/backup.js` + `js/modules/settings.js` | Exists as local-first backup; sync architecture documented in §6, not built yet (by design — Phase 1 has no cloud requirement) |

### 1.4 Platform targets
- **Android phone (portrait, one-handed):** bottom-sheet modals, slide-in drawer nav,
  single-column card grids.
- **Samsung DeX / tablet / desktop window (≥768px, ≥1200px):** sidebar becomes a fixed rail,
  card grids widen to 2–3 columns, modals center instead of sheet from the bottom, hover
  states activate only on pointer-capable devices (`@media (hover:hover) and (pointer:fine)`).
- Both are served by **one responsive codebase** — there is no separate DeX build.

---

## 2. Folder Structure

```
mti6-gtadwiy-cockpit/
├── index.html              # App shell: top bar, sidebar, offline indicator, view root
├── offline.html              # Fallback page when a route isn't cached and network fails
├── manifest.json             # PWA identity: name, icons, colors, start_url, shortcuts
├── sw.js                      # Service worker: offline cache + update-ready signal
├── netlify.toml                # Hosting header rules (keeps sw.js from stale-caching)
├── favicon.svg / icons/        # App icons (raster 192/512/maskable + vector source)
├── ROADMAP.md                   # This document
├── INSTALL.md                   # End-user install instructions
├── css/
│   └── style.css                 # One stylesheet: cockpit theme + full responsive rules
└── js/
    ├── utils.js                   # U — shared UI kit (DOM builder, toasts, modals,
    │                              #     inline validation, loading states, skeletons,
    │                              #     error panels, date-safe helpers)
    ├── db.js                       # CockpitDB — the ONE IndexedDB access point
    ├── backup.js                    # Encrypted local backup (export/import), Web Crypto
    ├── app.js                        # Router, sidebar, install prompt, SW registration,
    │                                 #   update banner, offline indicator
    └── modules/
        ├── dashboard.js                # MTI6 Cockpit Dashboard
        ├── vault.js                     # Knowledge Vault
        ├── tasks.js                      # Mission Control — Tasks
        ├── projects.js                    # Mission Control — Projects & Milestones
        ├── expenses.js                     # Resource Tracker
        └── settings.js                      # Device Sync Prep + app settings
```

**Why this shape:** a new module is always three touches — one new file in `js/modules/`, one
new entry in the `ROUTES` object in `app.js`, and (if it needs its own records) one new object
store in `db.js`. Nothing else moves. This is the property that lets Phase 2+ modules get
added without redesigning the app.

---

## 3. Database Structure (IndexedDB, database `mti6_gtadwiy_cockpit`)

One database, one object store per record type, every store keyed by `id` (except `settings`,
keyed by `key`). This is intentionally simple — a single flat store per concern, with light
indexes for the lookups each module actually needs, rather than a normalized relational schema
a browser database doesn't reward.

| Store         | Key      | Indexes                                | Fields (Phase 1)                                                                 | Used by |
|---------------|----------|------------------------------------------|-----------------------------------------------------------------------------------|---------|
| `notes`       | `id`     | `category`, `pinned`, `updatedAt`, `archived` | `title, body, category, tags[], pinned, archived, createdAt, updatedAt`          | Knowledge Vault |
| `tasks`       | `id`     | `status`, `priority`, `dueDate`           | `title, notes, priority, status, dueDate, createdAt, updatedAt`                   | Mission Control |
| `projects`    | `id`     | `status`                                   | `name, status, notes, createdAt, updatedAt`                                       | Mission Control |
| `milestones`  | `id`     | `projectId`                                | `projectId, title, dueDate, done, order`                                          | Mission Control |
| `expenses`    | `id`     | `category`, `date`, `monthKey`, `kind`     | `description, amount, category, date, monthKey, kind (expense\|asset\|purchase)`  | Resource Tracker |
| `activity`    | `id`     | `timestamp`                                | `type, message, refId, timestamp`                                                  | Dashboard (recent activity feed) |
| `widgets`     | `id`     | —                                            | `type, title, order`                                                               | Dashboard (customizable widget layout) |
| `settings`    | `key`    | —                                            | `value` (theme, currency, etc.)                                                    | Settings / Device Sync Prep |

**Relationships** (all enforced in application code, not foreign keys — IndexedDB has none):
- `milestones.projectId` → `projects.id` (one project has many milestones; deleting a project
  cascades to delete its milestones).
- `activity.refId` → the id of whatever record the log line is about (notes/tasks/
  expenses/projects) — used only for traceability, never required for the app to function.
- Every other store is independent; this is deliberate so one module's failure or growth
  never touches another's schema.

**New in Phase 1** (additive, non-breaking):
- `notes.archived` (boolean) — backs the Knowledge Vault's **Research Archive**.
- `expenses.kind` (`"expense" | "asset" | "purchase"`, defaults to `"expense"`) — backs the
  Resource Tracker's asset/purchase tracking without needing a new store.

---

## 4. Module Relationships

```
Dashboard ──reads from──> notes, tasks, expenses, projects, milestones, activity, widgets
   │                                   (dashboard never writes to these — read-only rollups)
   └──writes to──> widgets   (the user's own widget layout)

Knowledge Vault ──owns──> notes
   └──writes to──> activity   (on create/edit/delete/pin/archive)

Mission Control (Tasks) ──owns──> tasks
   └──writes to──> activity

Mission Control (Projects) ──owns──> projects, milestones
   │  (milestones.projectId links a milestone to exactly one project)
   └──writes to──> activity

Resource Tracker ──owns──> expenses
   └──writes to──> activity

Settings / Device Sync Prep ──owns──> settings (theme, currency)
   ├──reads from──> ALL stores        (Export Backup — full snapshot)
   └──writes to──> ALL stores          (Import Backup — full or merge restore)
                                        (Reset — clears all EXCEPT settings + widgets,
                                         so your preferences and dashboard layout survive)
```

No module ever reaches into another module's file to call its internals — the only shared
contract between modules is the data in `CockpitDB` and the UI kit in `U`. This is what keeps
them independently buildable and testable.

---

## 5. Build Order

**Phase 1 — Foundation (this phase):**
1. ✅ Architecture plan, folder structure, DB schema, module map, build order (this document)
2. 🔨 **MTI6 Cockpit Dashboard** — rebuilt with Quick Actions, System Widgets framing, Search,
   sidebar nav, DeX layout (building now)
3. 🔨 **Knowledge Vault** — extended with a Research Archive on top of existing notes/
   categories/tags/search/pinning (building now)
4. Mission Control (Tasks + Projects) — already functional from the prior build; confirmed
   working, left stable this phase
5. Resource Tracker — already functional; extended this phase with asset/purchase entry
   kinds so it covers "Expenses, Assets, Purchases" as named in your brief
6. Device Sync Preparation — local-first backup/export/import already functional; this phase
   adds the forward-looking sync architecture notes below (§6) without building cloud sync,
   per your "no cloud requirement" rule

**Phase 2 (proposed, not started):** richer Mission Control (recurring tasks, task↔project
linking in the UI), Resource Tracker charts/budgets, Vault file/image attachments.

**Phase 3 (proposed, not started):** the actual device-to-device sync transport described in
§6, as an opt-in module — never required for the app to work.

---

## 6. Device Sync Preparation — forward-looking architecture (not built in Phase 1)

Per your brief, Phase 1 keeps this **local storage first**, with backup/restore as the only
cross-device mechanism, and intentionally builds **no cloud requirement**. So nothing in this
section is implemented yet — it exists so a future phase can add real sync without
redesigning the data layer.

- **Today:** `js/backup.js` encrypts the full `CockpitDB.exportAll()` snapshot (AES-256-GCM,
  PBKDF2-derived key, 210,000 iterations) into one `.json` file. Importing it on another
  device replays that snapshot in (replace or merge). This is manual, point-in-time, and
  entirely under your control — nothing leaves the device unless you export the file yourself.
- **Future-ready hooks already in the schema:** every record already carries `createdAt` /
  `updatedAt` timestamps, and every store is already a flat, independently-exportable
  collection — the two preconditions a future sync layer would need for conflict resolution
  (e.g. last-write-wins per record) without a schema migration.
- **A real sync transport is explicitly out of scope** until you choose one (e.g. a
  self-hosted relay you control, WebRTC device-to-device, or a user-supplied storage
  provider) — Phase 1 ships with none of those wired in, by design.

---

*End of Phase 1 architecture plan. Implementation of the Cockpit Dashboard and Knowledge
Vault begins immediately following this document, per your instruction.*
