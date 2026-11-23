// PostCSS config for the MTI6 unified React app.
//
// ROOT-CAUSE FIX (2026-11-22): Tailwind CSS never compiled — no
// postcss.config.* existed anywhere in the repo, so Vite passed
// src/index.css through with the raw `@tailwind` directives intact and
// the deployed CSS (dist/assets/index-CLqKnzSJ.css, 416 bytes) contained
// no utilities at all: no flex, no gap, no fixed, no h-4, no colors.
// That single fact explained everything the live preview checks found:
// the nav icon overlap (no flex/gap), the oversized icons (no h-4),
// and the Accounts / Pop Out / STAR panels rendering in-flow (no
// fixed). The panels already used correct Tailwind classes
// (App.tsx:345 fixed bottom-20 left-4 z-40, :384 fixed inset-0 z-50 flex
// justify-end bg-black/60 backdrop-blur-sm, :414 fixed bottom-5 right-5
// z-50) — the classes simply did not exist in the CSS. This file wires
// PostCSS + Tailwind + Autoprefixer into the Vite build so the utilities
// are generated from tailwind.config.js's content list.
//
// NOTE: package.json has `"type": "module"`, so this file MUST be .cjs
// with module.exports — a .js file with module.exports would fail under
// ESM, and an ESM export would not be read as a PostCSS config by Vite's
// postcss-load-config.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
