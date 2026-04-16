# Glass Browser — Getting Started

## What is Glass Browser?

Glass Browser is a privacy-focused desktop browser built on
ungoogled-chromium with a completely reimagined user interface
inspired by Apple's Glass design language (iOS 26).

### Key Features

- **Apple Glass UI** — Translucent surfaces, frosted glass effects,
  rounded corners, capsule shapes
- **Vertical Tabs** — Collapsible sidebar showing favicons (collapsed)
  or full tab info (expanded on hover)
- **Claude AI Built-in** — Automatic tab grouping, page summarization,
  tab comparison, deep research
- **Honey Extension** — Automatic coupon finding, pre-installed
- **Bing Default Search** — Privacy-respecting default search engine
- **Discovery Feed** — Personalized news on new tab page with
  30-minute auto-refresh
- **Dark Theme** — System-wide dark glass morphism theme

## Building from Source

### Prerequisites

**macOS:**
- macOS 13 (Ventura) or later
- Xcode 15+ with command-line tools (`xcode-select --install`)
- Python 3.9+ (`brew install python3`)
- ~100GB free disk space
- ~16GB RAM (32GB recommended)

**Windows:**
- Windows 10/11 64-bit
- Visual Studio 2022 with "Desktop development with C++" workload
- Windows 10/11 SDK (10.0.22621.0+)
- Python 3.9+
- ~100GB free disk space
- ~16GB RAM (32GB recommended)

### Build Steps

#### macOS

```bash
# Clone the repository
git clone https://github.com/nicholaswmin/ungoogled-chromium.git
cd ungoogled-chromium

# Build for Apple Silicon (default)
./glass-browser/scripts/build-mac.sh

# Build for Intel Mac
./glass-browser/scripts/build-mac.sh --arch x64

# Debug build
./glass-browser/scripts/build-mac.sh --debug
```

#### Windows

```bash
# Clone the repository
git clone https://github.com/nicholaswmin/ungoogled-chromium.git
cd ungoogled-chromium

# Build
./glass-browser/scripts/build-windows.sh

# Debug build
./glass-browser/scripts/build-windows.sh --debug
```

### Running

After building, launch with Glass features enabled:

```bash
# macOS
open out/Glass/Chromium.app --args \
  --glass-theme \
  --glass-ntp \
  --glass-default-bing \
  --glass-vertical-tabs \
  --glass-claude

# Windows
out\Glass\chrome.exe ^
  --glass-theme ^
  --glass-ntp ^
  --glass-default-bing ^
  --glass-vertical-tabs ^
  --glass-claude
```

### Command-Line Flags

| Flag                      | Description                          |
|---------------------------|--------------------------------------|
| `--glass-theme`           | Enable Glass dark theme              |
| `--glass-ntp`             | Enable Glass New Tab Page            |
| `--glass-default-bing`    | Set Bing as default search           |
| `--glass-vertical-tabs`   | Enable vertical tab sidebar          |
| `--glass-claude`          | Enable Claude AI panel               |

All flags are **off by default** — this follows ungoogled-chromium's
design principle of opt-in features.

## Setting Up Claude AI

1. Open Glass Browser with `--glass-claude` flag
2. Click the Claude icon in the vertical tab sidebar (or press `Cmd+Shift+C`)
3. Go to Settings > Claude AI
4. Enter your Anthropic API key (get one at console.anthropic.com)
5. Claude is now ready — try "Organize my tabs"

## Customizing the New Tab Page

### Bookmarks
- Hover over the bookmarks section and click "Edit"
- Add, remove, or reorder bookmarks
- Changes are saved locally

### Discovery Feed
- Click the gear icon (⚙) next to "Discover"
- Select topics that interest you
- Toggle browsing history integration
- Configure refresh interval (15, 30, or 60 minutes)
- Toggle sponsored content

### Background Images
- Images rotate automatically through bucket-list travel destinations
- A new image appears each time you open a new tab

## Project Structure

```
glass-browser/
├── resources/
│   ├── newtab/              # New Tab Page (HTML/CSS/JS)
│   │   ├── newtab.html      # NTP structure
│   │   ├── newtab.css       # Glass morphism styles
│   │   └── newtab.js        # Search, bookmarks, feed logic
│   ├── sidebar/             # Vertical tabs + Claude panel
│   │   ├── vertical-tabs.*  # Tab sidebar (HTML/CSS/JS)
│   │   └── claude-panel.*   # Claude AI panel (HTML/CSS/JS)
│   └── theme/
│       └── glass-dark.css   # Complete design token system
├── patches/                 # Chromium source patches
│   ├── glass-branding.patch
│   ├── glass-dark-theme.patch
│   ├── glass-vertical-tabs.patch
│   ├── glass-ntp-and-defaults.patch
│   └── glass-honey-extension.patch
├── config/
│   ├── glass_flags.gn       # GN build configuration
│   ├── default-bookmarks.json
│   └── feed-config.json
├── scripts/
│   ├── build-mac.sh         # macOS build script
│   └── build-windows.sh     # Windows build script
└── docs/
    ├── architecture.md      # System architecture
    ├── design-system.md     # Visual design reference
    ├── security.md          # Security documentation
    └── getting-started.md   # This file
```

## Contributing

1. Create a feature branch from `main`
2. Follow the design system in `docs/design-system.md`
3. Ensure all Glass features are opt-in (off by default)
4. Test on both macOS and Windows
5. Submit a pull request with clear description
