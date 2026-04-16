# Glass Browser

**A privacy-focused desktop browser with an Apple Glass-inspired interface.**

Built on [ungoogled-chromium](https://github.com/nicholaswmin/ungoogled-chromium),
Glass Browser reimagines the browsing experience with translucent glass morphism
UI, vertical tabs, built-in Claude AI, and the Honey extension — all wrapped in
a dark theme that feels like holding a pane of frosted glass.

## Features

### Apple Glass UI
Dark translucent surfaces with `backdrop-filter` glass effects, 5 elevation
levels, Apple's system color palette, rounded corners on everything, capsule
toggles, and spring-based animations. Every pixel designed with Jony Ive and
Dieter Rams as inspiration.

### Vertical Tabs
The tab strip moves to a sidebar on the left. **Collapsed** (52px): just
favicons and group color dots. **Hover to expand** (280px): full tab titles,
group headers, and close buttons. Drag-and-drop between groups. Search/filter
tabs instantly.

### Claude AI Integration
Claude for Chrome is built into a right-side panel. It can:
- **Organize tabs** into topic-based groups (e.g., "Las Vegas Trip Planning",
  "Running Shoes Shopping")
- **Summarize** the current page
- **Compare** products across multiple tabs
- **Deep research** topics from your browsing context

### Honey Built-in
The Honey coupon extension by PayPal is pre-installed. It automatically
finds and applies coupon codes at checkout. Users can disable or remove it
at any time.

### Smart New Tab Page
- **Search bar** piped to Bing with glass capsule styling
- **Bookmark grid** — 2 rows of glass tiles with favicons
- **Background** — Rotating bucket-list travel and nature photography
- **Discovery feed** — Personalized news articles refreshing every 30 minutes
- **Ad integration** — Every 4th article is a Google AdSense block
- **Personalization** — Choose topics, toggle history-based recommendations

### Privacy
Inherits all ungoogled-chromium privacy features: no Google telemetry, no
crash reporting, no Safe Browsing calls, domain substitution, and empty
Google API keys.

## Quick Start

```bash
# macOS (Apple Silicon)
./glass-browser/scripts/build-mac.sh

# macOS (Intel)
./glass-browser/scripts/build-mac.sh --arch x64

# Windows
./glass-browser/scripts/build-windows.sh
```

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Build instructions and setup |
| [Architecture](docs/architecture.md) | System design and data flow |
| [Design System](docs/design-system.md) | Colors, typography, components |
| [Security](docs/security.md) | Threat model and security practices |

## Design Tokens

```
Surfaces:  5 levels  (rgba dark, 0.72α → 0.92α)
Text:      4 levels  (white, 92% → 18%)
Accents:   10 colors (Apple dark mode palette)
Radii:     7 sizes   (4px → pill)
Blur:      4 levels  (12px → 64px)
Motion:    3 curves  (default, spring, smooth)
```

## License

Glass Browser modifications are released under the same license as
ungoogled-chromium. Chromium source is licensed under the BSD license.
