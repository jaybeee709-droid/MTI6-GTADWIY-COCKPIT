# Installing MTI6-GTADWIY-COCKPIT

MTI6-GTADWIY-COCKPIT is a **Progressive Web App (PWA)**: a set of web files that your phone's
browser can install like a native app. It needs **no server to run long-term**, but Android's
"Add to Home screen" feature only works for pages loaded over **HTTPS** or from **localhost**
(this is a security rule built into every mobile browser, not a limitation of this app). Below
are three ways to get it onto your phone, from easiest to most hands-on. After installation,
the app runs **100% offline** — the one-time step below is only to hand the files to your
phone's browser.

## What you're installing
A private, single-user cockpit app with a Dashboard, Knowledge Vault, Task Manager, Expense
Tracker, Project Manager, and Settings. All data is stored on your device using IndexedDB.
There is no login, no account, no cloud sync, and no VPS. Nothing ever leaves your phone unless
you deliberately export a backup file yourself.

---

## Option A — Host it for free in a few minutes (recommended, no PC needed later)

1. Unzip `mti6-gtadwiy-cockpit.zip` on a computer (or directly on your phone with a file manager
   app that supports unzip, such as the built-in Android "Files" app).
2. Create a free account at **GitHub Pages**, **Netlify Drop**, or **Cloudflare Pages** —
   all three let you drag-and-drop a folder and get a free `https://` URL in under a minute,
   with no code required:
   - **Netlify Drop**: go to `app.netlify.com/drop` and drag the unzipped folder in. You get an
     instant `https://your-name.netlify.app` link.
   - **GitHub Pages**: create a new repository, upload the unzipped files, then turn on
     "Pages" in the repository settings.
3. Open that `https://` link on your Android phone in Chrome or Samsung Internet.
4. Tap the **Install** button inside the app's top bar, or use the browser menu → **"Add to
   Home screen"** / **"Install app"**.
5. The app icon now appears on your home screen like any other app. From this point on it
   works fully offline — you can turn on airplane mode and it still opens and saves data.

This is the best option because the free HTTPS link keeps working for future updates, and
nothing is ever stored on that host except the static app files you already unzipped (your
notes/tasks/expenses stay on your phone, never uploaded there).

## Option B — Run it from your own phone with Termux (no computer, fully private)

1. Install **Termux** from F-Droid (recommended) or the Play Store.
2. Move the unzipped `mti6-gtadwiy-cockpit` folder into your phone's storage (e.g. `Downloads`).
3. In Termux:
   ```
   pkg install python
   cd /sdcard/Download/mti6-gtadwiy-cockpit
   python -m http.server 8080
   ```
4. In Chrome on the same phone, open `http://localhost:8080/index.html`. Browsers treat
   `localhost` as trusted, so **"Add to Home screen"** and offline install both work here too.
5. Tap **Install** / **"Add to Home screen"**. Once installed, you can stop the Termux server —
   the installed app keeps working offline because the service worker already cached everything.

## Option C — Quick local preview from a PC on the same Wi-Fi

1. Unzip the project on a laptop that's on the same Wi-Fi as your phone.
2. From a terminal in that folder, run `python3 -m http.server 8080` (Python 3 is already on
   most Macs/Linux machines; on Windows, install Python first).
3. Find the laptop's local IP address (e.g. `192.168.1.42`).
4. This LAN route is HTTP, not HTTPS, so most browsers will **block the install prompt** even
   though the app itself loads and works fully — use this option only to preview the app, and
   use Option A or B to actually install it to your home screen.

---

## Samsung DeX

No extra setup is needed. Open the installed app (or the hosted link) while connected to DeX —
the layout automatically switches to a wider, sidebar-based desktop layout with larger touch/
click targets at 768px and 1200px+ screen widths.

## Updating the app later

If you host it (Option A), just re-upload the changed files to the same host — the service
worker automatically detects the new files on your next visit and refreshes the cache in the
background.

## Your data, your device

- Everything you create (notes, tasks, expenses, projects, milestones) is stored in your
  phone's browser-local **IndexedDB** — never transmitted anywhere.
- The Dashboard's widgets are fully yours to arrange: use **+ Add Widget** to add stat or
  list widgets (pinned notes, upcoming tasks, recent expenses, project progress, a clock,
  and more), and the ▲ / ▼ / ✕ controls on each widget to reorder or remove it. Your layout
  is saved on-device and survives a Reset.
- Use **Settings → Export backup** to save an encrypted copy of all your data as a `.json`
  file you control (protected with a passphrase you choose).
- Use **Settings → Import backup** on another device (after installing the app there the same
  way) to restore your data, or to move between devices.
- **Settings → Reset application** permanently erases everything on that device — export a
  backup first if you want to keep it.

## Folder structure

```
mti6-gtadwiy-cockpit/
├── index.html            # App shell (loads on every screen)
├── offline.html           # Shown when a page can't load and isn't cached yet
├── manifest.json          # PWA install metadata (name, icons, colors, shortcuts)
├── sw.js                  # Service worker — caches everything for offline use
├── netlify.toml            # Hosting config — stops sw.js from being stale-cached
├── favicon.svg             # Browser tab icon (vector)
├── INSTALL.md              # This file
├── ROADMAP.md               # Phase 1 architecture plan: structure, DB schema, module map, build order
├── css/
│   └── style.css          # Dark cockpit theme, mobile-first + Samsung DeX layout
├── js/
│   ├── utils.js            # Shared UI helpers: DOM builder, toasts, inline field errors,
│   │                       #   button-loading state, skeleton loaders, error panels
│   ├── db.js                # IndexedDB data layer (all modules read/write through this)
│   ├── backup.js            # Encrypted export/import (Web Crypto AES-GCM + PBKDF2)
│   ├── app.js                # Router, nav drawer (swipe/Escape/backdrop to close),
│   │                         #   install prompt (+ iOS instructions), service worker
│   │                         #   registration and "update ready" reload banner
│   └── modules/
│       ├── dashboard.js      # Dashboard: customizable widgets (incl. 7-day spend chart),
│       │                     #   quick nav, search, recent activity
│       ├── vault.js          # Knowledge Vault: notes, categories, tags, pinning, search
│       ├── tasks.js          # Task Manager: priorities, due dates, filters, clear completed
│       ├── expenses.js       # Expense Tracker: month picker, totals, category breakdown
│       ├── projects.js       # Project Manager: milestones, progress tracking, notes
│       └── settings.js       # Settings: theme, currency, backup, reset, app status, update check
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    ├── icon-512-maskable.png
    └── icon.svg               # Vector source of the app icon
```

## Future modules

The router in `js/app.js` and the module pattern in `js/modules/` were built so a new module
is just: add a new file in `js/modules/`, register it in the `ROUTES` object in `app.js`, add
any new IndexedDB object stores it needs in `js/db.js`, and add a nav icon. No redesign of the
rest of the app is required — this is intentional, so Version 1 is a stable foundation for
whatever you add next (the brief explicitly excludes any crypto/banking/wallet/payment module
for this version).
