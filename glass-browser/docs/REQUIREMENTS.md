# Glass Browser — Detailed Requirements

## 1. VISUAL FOUNDATION

### 1.1 Background Layer
- **REQ-BG-1**: Full-viewport background image of bucket-list travel destinations, majestic landscapes, or nature/wildlife (Instagram-worthy quality)
- **REQ-BG-2**: Images sourced from a curated CDN or embedded as high-quality base64/bundled assets (NOT reliant on external APIs that may fail)
- **REQ-BG-3**: A semi-translucent dark overlay sits ON TOP of the background image, creating depth separation so foreground glass elements "float" above the photo
- **REQ-BG-4**: The overlay must use a gradient (darker at bottom, lighter at top center) so the search bar area is readable while the image still shows through
- **REQ-BG-5**: Image rotates to a new scene each time a new tab is opened (sequential, not random)
- **REQ-BG-6**: If image fails to load, fallback to a rich animated gradient (deep blues, purples, teals) — never a flat black screen

### 1.2 Apple Glass Design Language
- **REQ-GLASS-1**: All UI elements use `backdrop-filter: blur(20-40px) saturate(180%)` to create real frosted glass translucency against the background
- **REQ-GLASS-2**: Glass surfaces must be visibly translucent — the background image/gradient must show through every surface element
- **REQ-GLASS-3**: Every glass surface has a subtle 1px top edge highlight (`linear-gradient` white at 6-8% opacity) for physical glass-edge depth
- **REQ-GLASS-4**: All interactive elements have smooth spring-based animations (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- **REQ-GLASS-5**: Hover states lift elements with `translateY(-3px)` and add shadow depth
- **REQ-GLASS-6**: Press/active states scale down to `0.97` for haptic-like feedback

### 1.3 Dark Theme
- **REQ-DARK-1**: Base background is deep dark (never pure #000 — use #0a0a1a or similar)
- **REQ-DARK-2**: Text hierarchy: primary (white 92%), secondary (white 70%), tertiary (white 40%)
- **REQ-DARK-3**: Accent colors follow Apple's dark mode system palette (Blue #0A84FF, Teal #64D2FF, Green #30D158, etc.)
- **REQ-DARK-4**: No bright whites or harsh contrasts anywhere

### 1.4 Rounded Corners & Capsule Shapes
- **REQ-RADIUS-1**: Search bar is fully pill-shaped (`border-radius: 100px`)
- **REQ-RADIUS-2**: Bookmark tiles use `border-radius: 20px`
- **REQ-RADIUS-3**: Article cards use `border-radius: 20px`
- **REQ-RADIUS-4**: Toggles are Apple-style capsule switches (51×31px, 27px circular knob)
- **REQ-RADIUS-5**: All buttons, chips, and tags are pill-shaped
- **REQ-RADIUS-6**: Modals use `border-radius: 28px`
- **REQ-RADIUS-7**: No sharp 90° corners anywhere in the UI

---

## 2. SEARCH BAR

- **REQ-SEARCH-1**: Centered horizontally, positioned in the upper third of the viewport
- **REQ-SEARCH-2**: Pill-shaped glass container with magnifying glass icon on the left
- **REQ-SEARCH-3**: Placeholder text: "Search with Bing"
- **REQ-SEARCH-4**: On focus: container glows subtly with teal (#64D2FF) shadow, icon turns teal, search hint "Enter" badge appears on the right
- **REQ-SEARCH-5**: On Enter: navigates to `https://www.bing.com/search?q={query}`
- **REQ-SEARCH-6**: Any keypress (when not in another input) auto-focuses the search bar
- **REQ-SEARCH-7**: Max width ~620px, doesn't stretch full screen

---

## 3. BOOKMARKS GRID

- **REQ-BM-1**: Positioned below the search bar
- **REQ-BM-2**: Exactly **2 rows** of bookmarks, **7 per row** (14 total visible)
- **REQ-BM-3**: Each bookmark is a glass tile with:
  - A **colored icon container** (44×44px, rounded 12px) with the site's brand color as a gradient background
  - The site favicon (28×28px) centered inside the icon container
  - If favicon fails: show the first letter of the site name as a large white character on the colored background
  - Site name label below (11px, secondary text color, truncated with ellipsis)
- **REQ-BM-4**: Default bookmarks: Bing, YouTube, Gmail, Reddit, GitHub, Wikipedia, Twitter, Amazon, Netflix, LinkedIn, Maps, News, Spotify, Translate
- **REQ-BM-5**: Each bookmark tile has distinct brand colors for the icon background:
  - Bing: teal gradient
  - YouTube: red gradient
  - Gmail: red-orange gradient
  - Reddit: orange gradient
  - GitHub: purple-gray gradient
  - etc.
- **REQ-BM-6**: Hover: tile lifts up, scales slightly, shadow deepens
- **REQ-BM-7**: An "Edit" button appears on hover over the bookmarks section (top-right)
- **REQ-BM-8**: Edit modal allows adding, removing, and reordering bookmarks
- **REQ-BM-9**: Bookmarks persist in `localStorage` / `chrome.storage.local`
- **REQ-BM-10**: Grid is responsive: collapses to 5 columns on tablets, 4 on mobile

---

## 4. DISCOVERY FEED

### 4.1 Layout
- **REQ-FEED-1**: Below the bookmarks, spanning full width (max ~1060px)
- **REQ-FEED-2**: Header row: "Discover" title on left, settings gear + refresh button on right
- **REQ-FEED-3**: 3-column grid of article cards (4 columns on ultrawide, 2 on tablet, 1 on mobile)

### 4.2 Article Cards
- **REQ-FEED-4**: Each article card contains:
  - **Poster image** (150px tall, full width of card, `object-fit: cover`)
  - If image fails: show a gradient placeholder with a subtle newspaper icon
  - **Publisher name** (11px, uppercase, teal accent color)
  - **Headline/title** (14px, semibold, max 3 lines with ellipsis clamp)
  - **Time ago** (11px, tertiary text, e.g., "2 hours ago")
- **REQ-FEED-5**: Cards are glass surfaces with the standard glass treatment (blur, border, highlight)
- **REQ-FEED-6**: Hover: card lifts, shadow deepens, border brightens

### 4.3 Ad Integration
- **REQ-FEED-7**: Every **4th position** in the feed is a Google AdSense ad block
- **REQ-FEED-8**: Ad cards are visually distinct: dashed border, "Sponsored" label top-right
- **REQ-FEED-9**: Ad slots are `<div>` containers ready for AdSense `<ins>` injection
- **REQ-FEED-10**: If ads are disabled in settings, these slots are simply removed

### 4.4 Personalization & Refresh
- **REQ-FEED-11**: Feed auto-refreshes every 30 minutes (configurable: 15/30/60 min)
- **REQ-FEED-12**: Articles sourced from Bing News API (with fallback static articles when API unavailable)
- **REQ-FEED-13**: Browsing history is analyzed locally (never sent externally) to infer topic interests
- **REQ-FEED-14**: User can select/deselect topic chips in settings (Technology, Sports, Travel, etc.)
- **REQ-FEED-15**: Settings modal accessible via gear icon, with Apple-style toggles for:
  - Use browsing history (on/off)
  - Show sponsored content (on/off)
  - Refresh interval (select dropdown)
  - Topic selection (chip grid)

---

## 5. VERTICAL TAB SIDEBAR

- **REQ-TABS-1**: Replaces horizontal tab strip with a left-side vertical sidebar
- **REQ-TABS-2**: **Collapsed state** (default): 52px wide, shows only favicons and colored group dots
- **REQ-TABS-3**: **Expanded state**: 280px wide, on mouse hover over the collapsed sidebar
- **REQ-TABS-4**: Expand/collapse transition: 280ms with ease-out curve, smooth width animation
- **REQ-TABS-5**: Tab groups are auto-organized by Claude AI based on page content/URL analysis
- **REQ-TABS-6**: Each group has: colored dot, group name (uppercase, small), tab count badge, collapse toggle
- **REQ-TABS-7**: Each tab shows: favicon (16px), title (truncated), close button (visible on hover)
- **REQ-TABS-8**: Active tab has a blue left border with subtle glow
- **REQ-TABS-9**: Drag-and-drop reordering within and between groups
- **REQ-TABS-10**: Tab search/filter input at the top of the sidebar
- **REQ-TABS-11**: Pinned tabs section at the bottom (separated by a thin border)
- **REQ-TABS-12**: Right-click context menu (glass-styled) with: Pin, Duplicate, Move to Group, Close, Close Others

---

## 6. CLAUDE AI PANEL

- **REQ-CLAUDE-1**: Right-side panel, 360px wide, slides in/out with animation
- **REQ-CLAUDE-2**: Toggle via: sidebar button, keyboard shortcut (Cmd+Shift+C), or programmatically
- **REQ-CLAUDE-3**: Header: Claude avatar, "Claude" name, "AI Assistant" badge, organize button, close button
- **REQ-CLAUDE-4**: Quick action chips: "Organize Tabs", "Summarize Page", "Compare Tabs", "Deep Research"
- **REQ-CLAUDE-5**: Chat interface with:
  - Assistant messages: glass surface, rounded corners (rounded bottom-left is smaller for speech bubble effect)
  - User messages: blue-tinted, aligned right
  - Typing indicator: 3 bouncing dots
- **REQ-CLAUDE-6**: Tab organization preview: shows suggested groups with Apply/Dismiss buttons
- **REQ-CLAUDE-7**: Input area: auto-resizing textarea with send button, "Powered by Anthropic" footer
- **REQ-CLAUDE-8**: API key stored securely in `chrome.storage.local`, proxied through service worker (never exposed to page context)
- **REQ-CLAUDE-9**: Rate limiting: max 10 requests/minute

---

## 7. BUNDLED EXTENSIONS & DEFAULTS

- **REQ-EXT-1**: Honey by PayPal pre-installed (from Chrome Web Store, user can disable/remove)
- **REQ-EXT-2**: Default search engine: Bing (configurable in settings)
- **REQ-EXT-3**: Dark mode forced system-wide via `--force-dark-mode` flag

---

## 8. SECURITY REQUIREMENTS

- **REQ-SEC-1**: All dynamic text content inserted via `textContent` (never `innerHTML` with user data)
- **REQ-SEC-2**: All URLs validated: only `http:` and `https:` protocols allowed
- **REQ-SEC-3**: Strict Content Security Policy: no `eval()`, no inline scripts, restricted `connect-src`
- **REQ-SEC-4**: Claude API key never exposed to page context (service worker proxy only)
- **REQ-SEC-5**: Feed API responses fully sanitized before DOM insertion
- **REQ-SEC-6**: Image URLs restricted to HTTPS only
- **REQ-SEC-7**: No Google telemetry (inherited from ungoogled-chromium)

---

## 9. PLATFORM & BUILD

- **REQ-BUILD-1**: macOS build (Apple Silicon + Intel)
- **REQ-BUILD-2**: Windows build (x64)
- **REQ-BUILD-3**: Build extends ungoogled-chromium's 8-step pipeline
- **REQ-BUILD-4**: All Glass features are opt-in via command-line flags (off by default)
- **REQ-BUILD-5**: Launcher scripts wrap all flags for one-click startup

---

## 10. DOCUMENTATION

- **REQ-DOC-1**: Architecture document with system diagram and data flow
- **REQ-DOC-2**: Design system document with all tokens, components, and usage
- **REQ-DOC-3**: Security document with threat model and mitigations
- **REQ-DOC-4**: Getting started guide with build and setup instructions

---

## ACCEPTANCE CRITERIA

A requirement is **met** when:
1. The visual output matches the described behavior when viewed in a browser
2. Interactions (hover, click, focus) work as specified
3. Data persists correctly across page reloads
4. Security constraints are verifiable in the code
5. The design genuinely evokes Apple Glass (iOS 26) aesthetics — translucent, fluid, modern

A requirement is **NOT met** when:
1. Glass surfaces appear as flat opaque rectangles (no visible translucency)
2. External resource dependencies cause blank/broken UI
3. The layout feels generic or "bootstrap-like" rather than Apple-inspired
4. Animations are janky or absent
5. Security sanitization is missing on user/external data
