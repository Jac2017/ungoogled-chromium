# Glass Browser — Design Style Guide

## Design DNA

**Core Metaphor**: Looking through frosted glass at a beautiful world.

Every element is a pane of translucent glass floating above a stunning
photographic background. The user sees depth — foreground surfaces hover
above the image, light catches their edges, shadows anchor them in space.

**Design Lineage**:
- **Apple iOS 26 Glass** — Translucent materials, layered depth, vibrancy
- **Jony Ive** — "The absence of clutter. Order from complexity."
- **Dieter Rams** — "As little design as possible."

---

## 1. COLOR SYSTEM

### 1.1 Background Palette
```
Base (body):             #0a0a1a  (deep navy-black, never pure black)
Gradient layer:          Radial gradients of deep blue (#0f3278),
                         purple (#501e82), teal (#0a505a), plum (#782850)
                         overlaid on the base to create a living background
                         when no photo is loaded
```

### 1.2 Glass Surfaces
```
IMPORTANT: These are semi-transparent. The background MUST show through.

Surface Level 1 (cards, tiles):    rgba(255, 255, 255, 0.06)
Surface Level 2 (hover state):     rgba(255, 255, 255, 0.10)
Surface Level 3 (active/pressed):  rgba(255, 255, 255, 0.14)
Surface Level 4 (elevated/modal):  rgba(30, 30, 34, 0.88)

Note: Using white-based RGBA (not black-based) creates surfaces that
feel like frosted glass rather than dark plastic. The glass-blur effect
makes the background bleed through.
```

### 1.3 Borders
```
Subtle:                  rgba(255, 255, 255, 0.08)
Default:                 rgba(255, 255, 255, 0.12)
Hover:                   rgba(255, 255, 255, 0.20)
Focus/Accent:            rgba(100, 210, 255, 0.30)
Ad card (dashed):        rgba(255, 255, 255, 0.08) dashed
```

### 1.4 Text
```
Primary (headlines):     #FFFFFF (pure white, full opacity)
Secondary (body/labels): rgba(255, 255, 255, 0.70)
Tertiary (captions):     rgba(255, 255, 255, 0.40)
Placeholder:             rgba(255, 255, 255, 0.30)
```

### 1.5 Accent Colors (Apple Dark Mode System)
```
Blue:       #0A84FF    — Primary actions, focus rings, links
Teal:       #64D2FF    — Highlights, publisher names, search glow
Green:      #30D158    — Toggle ON state, success
Orange:     #FF9F0A    — Warnings, attention
Red:        #FF453A    — Destructive, errors, close hover
Purple:     #BF5AF2    — Special, creative
Pink:       #FF375F    — Social, notifications
Yellow:     #FFD60A    — Stars, favorites
```

### 1.6 Bookmark Brand Colors (icon backgrounds)
```
Each bookmark tile has a unique gradient background behind the favicon:

Bing:       linear-gradient(135deg, #00897B, #00ACC1)    teal
YouTube:    linear-gradient(135deg, #E53935, #FF1744)    red
Gmail:      linear-gradient(135deg, #E64A19, #FF5722)    red-orange
Reddit:     linear-gradient(135deg, #FF5722, #FF9100)    orange
GitHub:     linear-gradient(135deg, #424242, #6D4C9F)    gray-purple
Wikipedia:  linear-gradient(135deg, #546E7A, #78909C)    blue-gray
Twitter:    linear-gradient(135deg, #1565C0, #1E88E5)    blue
Amazon:     linear-gradient(135deg, #FF8F00, #FFB300)    amber
Netflix:    linear-gradient(135deg, #B71C1C, #E53935)    deep red
LinkedIn:   linear-gradient(135deg, #0277BD, #0288D1)    blue
Maps:       linear-gradient(135deg, #2E7D32, #43A047)    green
News:       linear-gradient(135deg, #0D47A1, #1565C0)    navy
Spotify:    linear-gradient(135deg, #1B5E20, #2E7D32)    dark green
Translate:  linear-gradient(135deg, #283593, #3F51B5)    indigo
```

---

## 2. GLASS EFFECT RECIPE

### 2.1 The Three-Layer Glass Formula

Every glass surface is built with 3 visual layers:

```css
/* Layer 1: Semi-transparent fill */
background: rgba(255, 255, 255, 0.06);

/* Layer 2: Backdrop blur (THIS is what makes it glass) */
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);

/* Layer 3: Edge highlight (glass catching light) */
border: 1px solid rgba(255, 255, 255, 0.10);
/* Plus a pseudo-element for top-edge shine: */
background: linear-gradient(180deg,
  rgba(255,255,255,0.08) 0%,
  transparent 40%);
```

### 2.2 Blur Intensities
```
Light:    blur(12px)    — Subtle depth (small elements)
Medium:   blur(20px)    — Standard glass (cards, tiles)
Heavy:    blur(40px)    — Search bar, toolbars
Ultra:    blur(60px)    — Modals, overlays
```

### 2.3 Shadow System
```
Resting:    0 4px 16px rgba(0, 0, 0, 0.25)
Hover:      0 12px 40px rgba(0, 0, 0, 0.35)
Elevated:   0 20px 60px rgba(0, 0, 0, 0.45)
Glow:       0 0 30px rgba(100, 210, 255, 0.10)  (search focus)
Inset top:  inset 0 1px 0 rgba(255, 255, 255, 0.08)  (inner glass edge)
```

---

## 3. TYPOGRAPHY

### 3.1 Font Stack
```
Primary:   -apple-system, BlinkMacSystemFont, 'SF Pro Display',
           'SF Pro Text', 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif
Monospace: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace
```

### 3.2 Scale
```
Search input:      17px   weight 400   tracking -0.01em
Feed title:        20px   weight 600   tracking -0.02em
Article headline:  14px   weight 600   tracking -0.01em   line-height 1.4
Publisher:         11px   weight 600   tracking 0.06em    uppercase
Bookmark label:    11px   weight 500   tracking 0.01em
Time ago:          11px   weight 400
Placeholder:       17px   weight 400
Modal title:       18px   weight 600   tracking -0.02em
Body text:         14px   weight 400   line-height 1.5
```

---

## 4. SPACING & SIZING

### 4.1 Component Dimensions
```
Search bar:        max-width 620px, height ~56px, padding 16px 24px
Bookmark tile:     ~96px wide (from 7-col grid), padding 16px 8px 12px
Bookmark icon:     44×44px, border-radius 12px
Favicon inside:    28×28px
Article card:      min-width ~280px (from grid)
Article image:     150px tall, full card width
Feed grid gap:     16px
Bookmark grid gap: 16px
```

### 4.2 Layout Positions
```
Content padding-top:   max(10vh, 64px)  — search floats in upper area
Search → Bookmarks:    36px gap
Bookmarks → Feed:      48px gap
Content side padding:  32px (desktop), 16px (mobile)
Content max-width:     1060px (feed), 760px (bookmarks), 620px (search)
```

---

## 5. BORDER RADII MAP
```
Search bar:              100px (pill)
Bookmark tile:           20px
Bookmark icon:           12px
Article card:            20px
Ad card:                 20px
Toggle track:            100px (pill)
Toggle knob:             50% (circle)
Buttons (primary):       100px (pill)
Chips/tags:              100px (pill)
Context menu:            16px
Modal:                   28px
Icon buttons:            50% (circle)
Select dropdown:         10px
Input fields:            10px
Scrollbar thumb:         100px
```

---

## 6. ANIMATION & MOTION

### 6.1 Easing Curves
```
Default (most transitions):  cubic-bezier(0.25, 1, 0.5, 1)
Spring (toggles, bouncy):    cubic-bezier(0.34, 1.56, 0.64, 1)
```

### 6.2 Duration Scale
```
Instant (press feedback):    80ms
Fast (hover states):         150ms
Normal (transitions):        250ms
Slow (modal entry):          400ms
Background crossfade:        1500ms
```

### 6.3 Interaction Patterns
```
Hover on card/tile:
  - translateY(-4px)
  - scale(1.03) for bookmarks only
  - Shadow deepens from "resting" to "hover"
  - Border opacity increases
  - Duration: 250ms ease-out

Active/Press on card/tile:
  - scale(0.97)
  - Duration: 80ms

Search focus:
  - Container scale(1.015)
  - Teal glow shadow appears
  - Icon color → teal
  - "Enter" hint fades in
  - Duration: 250ms

Modal entry:
  - translateY(20px) → translateY(0)
  - scale(0.96) → scale(1)
  - opacity 0 → 1
  - Duration: 400ms spring

Toggle switch:
  - Knob slides 20px
  - Track color transitions
  - Duration: 250ms spring
```

---

## 7. COMPONENT ANATOMY

### 7.1 Search Bar
```
╭─────────────────────────────────────────────────────╮
│  🔍  Search with Bing                     [Enter]   │
╰─────────────────────────────────────────────────────╯

Width: max 620px
Height: ~56px
Background: rgba(255,255,255,0.07)
Border: 1px solid rgba(255,255,255,0.10)
Border-radius: 100px (pill)
Blur: 40px
Shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)
```

### 7.2 Bookmark Tile
```
    ╭────────────╮
    │            │
    │  ╭──────╮  │      Icon container: 44x44, radius 12
    │  │ [🌐] │  │      Brand color gradient background
    │  ╰──────╯  │      Favicon: 28x28 centered inside
    │            │
    │   Label    │      11px, secondary color, ellipsis
    ╰────────────╯

Background: rgba(255,255,255,0.06)
Border: 1px solid rgba(255,255,255,0.08)
Border-radius: 20px
Blur: 20px
Top-edge: linear-gradient shine overlay
```

### 7.3 Article Card
```
╭──────────────────────────╮
│                          │
│      [Poster Image]      │    150px tall, cover fit
│                          │    Gradient placeholder if failed
│──────────────────────────│
│  PUBLISHER               │    11px teal uppercase
│  Headline text that can  │    14px semibold, max 3 lines
│  wrap to three lines...  │
│                          │
│  2 hours ago             │    11px tertiary
╰──────────────────────────╯

Background: rgba(255,255,255,0.06)
Border: 1px solid rgba(255,255,255,0.08)
Border-radius: 20px
Blur: 20px
```

### 7.4 Ad Slot
```
╭╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╮
╎                    [Sponsored] ╎
╎                          ╎
╎      Advertisement       ╎
╎                          ╎
╰╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╯

Border: 1px dashed rgba(255,255,255,0.08)
Background: rgba(255,255,255,0.04)
Min-height: 260px
```

### 7.5 Apple Toggle
```
OFF: ╭──────────────────╮     ON: ╭──────────────────╮
     │  ◯               │         │               ◯  │
     ╰──────────────────╯         ╰──────────────────╯
     Track: white 12%              Track: #30D158

Size: 51×31px
Knob: 27px diameter, white, shadow
Travel: 20px
Transition: 250ms spring curve
```

---

## 8. IMAGE STRATEGY

### 8.1 Background Photos (Embedded/Bundled)
For standalone reliability, bundle 4-6 base64-encoded compressed images
directly in the JS or serve them as data URIs. Each ~200KB JPEG at
1920×1080 = ~1.2MB total — acceptable for a browser NTP.

Categories:
- Bucket-list travel (Santorini, Machu Picchu, Cappadocia)
- Majestic landscapes (Norwegian fjords, Patagonia, Swiss Alps)
- Nature/wildlife (African safari, underwater coral, northern lights)

### 8.2 Article Images
Use CSS gradient placeholders with category-specific colors:
```
Technology:    linear-gradient(135deg, #1a237e, #283593)
Science:       linear-gradient(135deg, #004d40, #00695c)
Business:      linear-gradient(135deg, #1b5e20, #2e7d32)
Entertainment: linear-gradient(135deg, #4a148c, #6a1b9a)
Sports:        linear-gradient(135deg, #b71c1c, #c62828)
Travel:        linear-gradient(135deg, #01579b, #0277bd)
Health:        linear-gradient(135deg, #00838f, #00acc1)
General:       linear-gradient(135deg, #37474f, #455a64)
```

Each placeholder also shows a subtle icon (newspaper, flask, globe, etc.)
in the center at 15% opacity.

### 8.3 Favicons
Google's favicon service: `https://www.google.com/s2/favicons?domain=X&sz=64`
Fallback: colored letter initial on brand gradient (see §1.6).

---

## 9. RESPONSIVE BREAKPOINTS
```
≥1400px:    Feed 4 columns, bookmarks 7 columns
900-1399px: Feed 3 columns, bookmarks 7 columns (default)
600-899px:  Feed 2 columns, bookmarks 5 columns
<600px:     Feed 1 column, bookmarks 4 columns, reduced padding
```

---

## DESIGN PRINCIPLES (Checklist)

Before shipping any component, verify:

- [ ] Can I see the background through this element? (Glass translucency)
- [ ] Does it have a subtle top-edge highlight? (Glass edge)
- [ ] Are all corners rounded? (No sharp edges)
- [ ] Does hover lift it up with shadow? (Depth interaction)
- [ ] Does press/active scale it down? (Haptic feedback)
- [ ] Is the animation smooth and spring-based? (Fluid motion)
- [ ] Does it work without any external image/API? (Self-contained)
- [ ] Is the text hierarchy clear? (Primary → secondary → tertiary)
- [ ] Would Jony Ive look at this and nod? (Simplicity + depth)
- [ ] Would Dieter Rams say "nothing to remove"? (Minimal)
