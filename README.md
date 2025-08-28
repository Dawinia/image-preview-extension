# Enhanced Image Previewer

A simple yet powerful Chrome extension for enhancing web image preview experience.

[中文文档](./docs/README_zh.md)

## Features

- 🔍 One-click image preview
- 🖱️ Mouse wheel zoom
- 🎯 Drag to move
- 💫 Smooth animations
- 🎨 Elegant loading animations
- 🌐 Support for all websites
- ⌨️ Keyboard shortcuts support
- 🎮 Double-click to reset
- ⚙️ Customizable settings

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
*Coming soon*

## Usage

1. After installation, visit any webpage
2. Click any image to enter preview mode
3. Use mouse wheel to zoom
4. Drag to move the image
5. Click outside the preview window to close

### Keyboard Shortcuts

- `Esc`: Close preview
- `+`: Zoom in
- `-`: Zoom out
- `↑↓←→`: Move image
- Double-click/0: Reset image size and position

## Development

### Project Structure
```
├── manifest.json    // Extension configuration
├── popup.html      // Popup window UI
├── options.html    // Options page UI
├── js/
│   ├── constants.js  // Constants and configurations
│   ├── utils.js     // Utility functions
│   ├── content.js   // Main functionality
│   ├── popup.js     // Popup window logic
│   └── options.js   // Options page logic
├── css/
│   └── styles.css   // Styles
└── icons/          // Extension icons
    ├── icon128.svg
    ├── icon48.svg
    ├── icon16.svg
    ├── icon128.png
    ├── icon48.png
    └── icon16.png
```

### Feature Modules

- **Core Features** (`content.js`): 
  - Image preview
  - Drag operations
  - Zoom control
  - Keyboard shortcuts

- **Settings Management** (`options.js`):
  - Background color
  - Background opacity
  - Maximum zoom level
  - Zoom speed
  - Keyboard shortcuts toggle
  - Double-click reset toggle

- **Utility Functions** (`utils.js`):
  - Color conversion
  - Debounce handling
  - Value constraints
  - Transform calculations

### Local Development
1. After code changes, click refresh button in `chrome://extensions/`
2. For icon changes, regenerate PNG files:
```bash
cd icons
rsvg-convert -w 128 -h 128 icon128.svg -o icon128.png
rsvg-convert -w 48 -h 48 icon48.svg -o icon48.png
rsvg-convert -w 16 -h 16 icon16.svg -o icon16.png
```

### Coding Standards

- ES6+ module system
- Chrome extension best practices
- Configuration management via constants
- Modular functionality with separation of concerns
- Unified error handling
- Performance optimization measures

## Contributing

Contributions are welcome! Feel free to submit Pull Requests or Issues!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
