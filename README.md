# Enhanced Image Previewer

A lightweight Chrome Manifest V3 extension for enhancing web image preview experience.

[中文文档](./docs/README_zh.md)

## Features

- 🔍 One-click image preview
- 🖱️ Mouse wheel zoom
- 🎯 Drag to move
- 💫 Smooth animations
- 🎨 Elegant loading animations
- 🌐 Support for regular web pages
- ⌨️ Keyboard shortcuts support
- 🎮 Double-click to reset
- ⚙️ Customizable settings
- 🧩 Manifest V3 service worker command handling
- 🧱 Shadow DOM isolated preview UI
- 🌐 Chrome i18n locale files for English and Simplified Chinese

## Installation

### Development Version

1. Clone this repository

```bash
git clone https://github.com/dawinia/image-preview-extension.git
```

2. In Chrome browser:
   - Visit `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the cloned project folder

### Chrome Web Store

_Coming soon_

## Usage

1. After installation, visit any webpage
2. Click any image to enter preview mode
3. Use mouse wheel to zoom
4. Drag to move the image
5. Click outside the preview window to close

Preview triggering is tuned to stay close to normal image browsing behavior while avoiding obvious icon noise:

- Small images below the configured size threshold are ignored
- Linked images can still be previewed with a normal click, matching the original extension behavior
- The options page can require Alt/Option-click for previewing when you want to avoid accidental activation
- Chrome internal pages, Chrome Web Store pages, and extension pages do not allow normal content script injection

### Keyboard Shortcuts

- `Esc`: Close preview
- `+`: Zoom in
- `-`: Zoom out
- `↑↓←→`: Move image
- Double-click/0: Reset image size and position

## Development

### Project Structure

```
├── manifest.json          // MV3 extension configuration
├── popup.html             // Toolbar popup shell
├── options.html           // Options page shell
├── src/
│   ├── shared/
│   │   └── core.js        // Settings schema, helpers, messaging primitives
│   ├── content/
│   │   ├── previewer.js   // Page image preview controller
│   │   └── previewer.css  // Source copy of the Shadow DOM preview styles
│   ├── background/
│   │   └── service-worker.js // Command bridge for MV3 events
│   ├── popup/
│   │   └── popup.js       // Popup settings controls
│   └── options/
│       └── options.js     // Advanced settings controls
├── scripts/
│   ├── test.mjs           // Unit tests for shared behavior
│   └── verify.mjs         // Manifest, entrypoint, and syntax verification
├── _locales/              // Chrome i18n messages
├── .github/workflows/     // CI verification
└── icons/                 // Extension icons
```

### Feature Modules

- **Shared Core** (`src/shared/core.js`):
  - Default settings and normalization
  - DOM transform helpers
  - Cross-context settings and active-tab messaging

- **Content Previewer** (`src/content/previewer.js`):
  - Image preview
  - Pointer drag operations
  - Smooth wheel/trackpad zoom control
  - Keyboard shortcuts
  - Loading and error states
  - Shadow DOM isolation
  - Focus trap while the preview dialog is open

- **Preview Styles** (`src/shared/core.js`, `src/content/previewer.css`):
  - Runtime styles are embedded in `PREVIEW_STYLES` and applied synchronously inside the shadow root
  - `src/content/previewer.css` mirrors those styles as an editable source reference

- **MV3 Service Worker** (`src/background/service-worker.js`):
  - Initializes persisted settings
  - Handles extension command shortcuts
  - Forwards commands to the active content script

- **Settings UI** (`src/popup/popup.js`, `src/options/options.js`):
  - Preview enable/disable toggle
  - Alt/Option-click trigger mode
  - Minimum image size threshold
  - Background color
  - Background opacity
  - Maximum zoom level
  - Zoom speed
  - Keyboard shortcuts toggle
  - Double-click reset toggle

### Local Development

This extension is intentionally build-free: Chrome loads the source files directly from this repository.

1. After code changes, click refresh button in `chrome://extensions/`
2. Run the local verification suite:

```bash
npm run check
```

3. Optionally run a Chrome smoke test with a browser that supports unpacked extension loading from the command line:

```bash
npm run smoke
# or
CHROME_BIN="/path/to/Chrome for Testing" npm run smoke
```

4. For icon changes, regenerate PNG files:

```bash
cd icons
rsvg-convert -w 128 -h 128 icon128.svg -o icon128.png
rsvg-convert -w 48 -h 48 icon48.svg -o icon48.png
rsvg-convert -w 16 -h 16 icon16.svg -o icon16.png
```

### Coding Standards

- Chrome Manifest V3 architecture
- Static content script injection with a service worker for background events
- Shadow DOM isolation for injected page UI
- Shared settings schema across content, popup, options, and background contexts
- No inline scripts in extension pages
- ESLint, Prettier, static manifest checks, and CI verification

## Contributing

Contributions are welcome! Feel free to submit Pull Requests or Issues!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
