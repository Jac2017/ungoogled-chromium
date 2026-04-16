# Glass Browser — Architecture

## Overview

Glass Browser is a privacy-focused desktop browser built on ungoogled-chromium
with an Apple Glass-inspired interface. It combines Chromium's rendering engine
with a completely reimagined UI layer.

```
┌─────────────────────────────────────────────────────────────┐
│                     Glass Browser                           │
│                                                             │
│  ┌──────────┐  ┌──────────────────────┐  ┌──────────────┐  │
│  │ Vertical  │  │                      │  │  Claude AI    │  │
│  │ Tab       │  │   Content Area       │  │  Panel        │  │
│  │ Sidebar   │  │   (WebContents)      │  │  (Optional)   │  │
│  │           │  │                      │  │              │  │
│  │ 52px ↔    │  │                      │  │  360px       │  │
│  │ 280px     │  │                      │  │              │  │
│  │           │  │                      │  │              │  │
│  └──────────┘  └──────────────────────┘  └──────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Glass Dark Theme (backdrop-filter glass morphism)       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Rendering Engine (Chromium)
- **Blink** — HTML/CSS/JS rendering
- **V8** — JavaScript execution
- **Skia** — 2D graphics
- **cc** — Compositor

Glass Browser inherits all of Chromium's rendering capabilities
without modification. This ensures web compatibility, performance,
and security remain at Chromium-level standards.

### 2. Vertical Tab Sidebar (`GlassVerticalTabStrip`)
```
File: chrome/browser/ui/views/frame/glass_vertical_tab_strip.h/.cc
UI:   glass-browser/resources/sidebar/vertical-tabs.html/.css/.js

┌─────────────────────┐
│ GlassVerticalTabStrip│
│   (views::View)      │
│                      │
│  ┌─────────────────┐ │
│  │  views::WebView  │ │
│  │                  │ │
│  │  Hosts:          │ │
│  │  vertical-tabs   │ │
│  │  .html           │ │
│  │                  │ │
│  │  Communicates    │ │
│  │  via chrome.tabs │ │
│  │  API             │ │
│  └─────────────────┘ │
└─────────────────────┘
```

**States:**
- **Collapsed** (52px): Shows only favicons + color-coded group dots
- **Expanded** (280px): Full tab titles, group names, close buttons
- **Transition**: CSS `cubic-bezier(0.25, 1, 0.5, 1)` over 280ms

**Tab Groups:**
- Automatically organized by Claude AI based on page content
- Color-coded with Apple's system palette
- Collapsible with header click
- Drag-and-drop between groups

### 3. Claude AI Panel (`GlassClaudePanel`)
```
File: chrome/browser/ui/views/frame/glass_vertical_tab_strip.h/.cc
UI:   glass-browser/resources/sidebar/claude-panel.html/.css/.js

Communication:
  Browser ←→ Background Service Worker ←→ Anthropic API

Features:
  1. Tab Organization  → chrome.tabs + chrome.tabGroups APIs
  2. Page Summarization → Extracts text, sends to Claude
  3. Tab Comparison     → Reads multiple tabs, produces comparison
  4. Deep Research      → Multi-query research from browsing context
```

**Security Model:**
- API key stored in `chrome.storage.local` (encrypted at rest)
- Background service worker handles API calls (never exposed to pages)
- Panel runs in isolated WebView with restricted permissions
- No access to page content without explicit user action

### 4. New Tab Page
```
File: glass-browser/resources/newtab/newtab.html/.css/.js

┌──────────────────────────────────────────┐
│  ╔════════════════════════════════════╗   │
│  ║  [🔍] Search with Bing    [Enter] ║   │
│  ╚════════════════════════════════════╝   │
│                                          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│  │Bing│ │ YT │ │Mail│ │ GH │ │Wiki│    │  ← Row 1
│  └────┘ └────┘ └────┘ └────┘ └────┘    │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│  │Amzn│ │Nflx│ │Maps│ │News│ │Spot│    │  ← Row 2
│  └────┘ └────┘ └────┘ └────┘ └────┘    │
│                                          │
│  Discover                    [⚙] [↻]    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ [image]  │ │ [image]  │ │ [image]  │ │
│  │ ───────  │ │ ───────  │ │ ───────  │ │  ← Article cards
│  │ PUBLISHER│ │ PUBLISHER│ │ SPONSOR  │ │
│  │ Headline │ │ Headline │ │ Ad Block │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│                                          │
│  Background: Bucket-list travel image    │
│  Overlay: gradient + blur for depth      │
└──────────────────────────────────────────┘
```

**Feed System:**
- Fetches from Bing News API (personalized)
- Refreshes every 30 minutes (configurable)
- Browsing history used for topic inference
- Every 4th position is a Google AdSense block
- Topic preferences stored in `chrome.storage.local`

### 5. Glass Dark Theme
```
File: glass-browser/resources/theme/glass-dark.css
Integration: chrome/browser/themes/glass_theme_provider.h

Design Tokens:
  Surfaces:  5 elevation levels (0.72α → 0.92α)
  Text:      4 hierarchy levels (92% → 18% white)
  Accents:   10 Apple system colors
  Radii:     7 sizes (4px → pill)
  Blur:      4 intensities (12px → 64px)
  Shadows:   5 depths + 2 glow effects
  Motion:    4 easing curves + 5 durations
```

### 6. Bundled Extensions

**Honey by PayPal:**
- Pre-installed from Chrome Web Store
- Auto-updates via CRX update mechanism
- User can disable/remove at any time
- No elevated privileges

## Data Flow

```
User Input → Omnibox / Search Bar
    │
    ├── Search query → bing.com/search?q={query}
    │
    ├── URL → Chromium navigation stack → Blink renderer
    │
    └── Claude command → Background SW → Anthropic API
                                │
                                └── Response → Claude Panel WebView
```

## Build Pipeline

```
ungoogled-chromium patches
        │
        ├── 1. Download Chromium source
        ├── 2. Prune binaries
        ├── 3. Apply base patches (114 patches)
        ├── 4. Apply Glass Browser patches (5 patches)
        ├── 5. Copy Glass resources
        ├── 6. Domain substitution
        ├── 7. Generate GN build files
        └── 8. Compile with ninja
```

## Security Boundaries

| Boundary | Protection |
|----------|-----------|
| Page content ↔ Browser UI | Chromium's site isolation |
| Tab sidebar ↔ Page content | Isolated WebView context |
| Claude panel ↔ API | Background service worker proxy |
| Feed data ↔ User | Content sanitization (XSS prevention) |
| Extensions ↔ Browser | Manifest V3 permission model |
| User data ↔ Storage | chrome.storage.local (encrypted) |
