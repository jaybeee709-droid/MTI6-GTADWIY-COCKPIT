# MTI6-GTADWIY-COCKPIT

Main cockpit dashboard and control center.

This repository contains a local-first Progressive Web App for notes, tasks, expenses, projects, and settings. Everything is stored on-device in IndexedDB and works offline after first load.

## Features

- Dashboard with widgets and quick actions
- Knowledge Vault for notes, categories, tags, pinning, and archive
- Task manager with status, priority, and due dates
- Project manager with milestones
- Expense tracker with expense / asset / purchase kinds
- Encrypted local backup export and restore
- Installable PWA with offline support

## Run locally

From the project root:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

## Notes

- No server backend is required.
- Data remains in the browser's IndexedDB unless you explicitly export a backup.
- The app can be hosted on GitHub Pages, Netlify, or any static file host.
