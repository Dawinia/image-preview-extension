# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run check         # Full gate: test + verify + lint + format:check (run this before committing)
npm test              # Unit tests for shared behavior (scripts/test.mjs)
npm run verify        # Static checks: manifest, entrypoints, i18n keys, `node --check` syntax
npm run lint          # ESLint
npm run format        # Prettier --write (format:check is the read-only variant)
npm run smoke         # Optional Chrome smoke test; set CHROME_BIN to a Chrome-for-Testing binary
```

Run a single test by editing/filtering within `scripts/test.mjs` — it is a plain `node:test`-free script using `node:assert`, so there is no test-name filter flag.

## Architecture

Build-free Chrome Manifest V3 extension. Chrome loads the source files in `src/` directly; there is no bundler or transpile step. After code changes, hit refresh in `chrome://extensions/`.

**`src/shared/core.js` is the architectural keystone.** It is an IIFE (not an ES module) that freezes a single object onto `globalThis.ImagePreviewExtension`, exposing all shared constants, the settings schema, pure helpers (clamp, transform math, `computeWheelScale`, `shouldPreviewImage`), i18n (`applyI18n`), and messaging primitives. Every other context consumes it differently:

- **Content script** — manifest lists `core.js` _before_ `previewer.js` in `content_scripts.js`, so the global is populated first. `verify.mjs` asserts this ordering.
- **Service worker** (`src/background/service-worker.js`) — pulls it in via `importScripts('../shared/core.js')` (`background.type` is `classic`, not module).
- **Popup / Options** — load it via a `<script src>` tag in `popup.html` / `options.html`.

Because of this, changes to shared logic belong in `core.js`, and its public surface is the frozen object at the bottom of the file. Keep it framework-free and side-effect-free on load.

**Settings** are the single source of truth in `core.js`: `DEFAULT_SETTINGS`, `SETTINGS_LIMITS`, `normalizeSettings`, `mergeSettings`, `readSettings`/`writeSettings` (backed by `chrome.storage.sync`). All reads/writes go through these so every context stays consistent. Adding a setting means updating the schema, limits, normalization, and the popup/options UI together.

**Preview UI** (`src/content/previewer.js`) renders into a **Shadow DOM** host to isolate from page styles. Preview CSS lives as the `PREVIEW_STYLES` string in `core.js` and is injected into the shadow root — it is intentionally _not_ a manifest content-script CSS file and _not_ a web-accessible resource (`verify.mjs` enforces both). `previewer.css` exists but styles are applied via the shadow root.

**Background command flow**: the `toggle_last_preview` keyboard command hits the service worker, which calls `sendMessageToActiveTab` to relay a `TOGGLE_LAST_PREVIEW` message to the active tab's content script.

## Invariants enforced by `scripts/verify.mjs`

Breaking any of these fails CI. Before changing manifest/structure, re-read `verify.mjs`:

- `package.json` `version` must equal `manifest.json` `version`.
- Manifest name/description use `__MSG_*__` placeholders; `default_locale` is `en`; `permissions` is exactly `["storage"]`.
- No inline `<script>` in `popup.html` / `options.html` — external `src` only.
- i18n keys must exist in **both** `_locales/en` and `_locales/zh_CN` (the checked key list is in `verify.mjs`).
- No `web_accessible_resources`; content-script `css` must stay undefined (styles go through the shadow root).

## i18n

UI strings resolve through `chrome.i18n` via `data-i18n` / `data-i18n-attr` attributes processed by `applyI18n`. Any new user-facing string needs an entry in every `_locales/<locale>/messages.json`.
