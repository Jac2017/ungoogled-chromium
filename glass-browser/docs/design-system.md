# Glass Browser — Design System

## Design Philosophy

Glass Browser's visual language draws from two legendary designers:

**Jony Ive** — *"True simplicity is derived from so much more than just the
absence of clutter and ornamentation. It's about bringing order to complexity."*
- Translucent, layered surfaces that create depth
- Physical-feeling interactions (spring animations, haptic feedback)
- Reduction to essential elements

**Dieter Rams** — *"Less, but better."*
- Every element serves a purpose
- Honest materials (glass is glass, not pretending to be something else)
- Unobtrusive design that gets out of the way

## Color System

### Dark Theme Surfaces

Glass Browser uses a 5-level surface elevation system. Each level adds
opacity, creating a natural sense of depth:

```
Level 0 (Base):     rgba(0, 0, 0, 0.95)      — Background
Level 1 (Surface):  rgba(28, 28, 30, 0.72)    — Panels, sidebars
Level 2 (Card):     rgba(38, 38, 40, 0.78)    — Cards, toolbars
Level 3 (Elevated): rgba(48, 48, 50, 0.82)    — Headers, navigation
Level 4 (Floating): rgba(58, 58, 60, 0.88)    — Popovers, menus
Level 5 (Modal):    rgba(72, 72, 74, 0.92)    — Modals, dialogs
```

### Text Hierarchy

Four levels of text opacity for clear information hierarchy:

```
Primary:    rgba(255, 255, 255, 0.92)  — Headlines, active text
Secondary:  rgba(255, 255, 255, 0.55)  — Body text, labels
Tertiary:   rgba(255, 255, 255, 0.35)  — Captions, hints
Quaternary: rgba(255, 255, 255, 0.18)  — Disabled, decorative
```

### Accent Palette

Apple's dark mode system colors:

| Color   | Hex       | Usage                           |
|---------|-----------|-------------------------------- |
| Blue    | `#0A84FF` | Primary actions, focus states   |
| Teal    | `#64D2FF` | Accent highlights, links        |
| Green   | `#30D158` | Success, toggle on state        |
| Orange  | `#FF9F0A` | Warnings, attention             |
| Red     | `#FF453A` | Destructive, errors             |
| Purple  | `#BF5AF2` | Creative, special               |
| Pink    | `#FF375F` | Social, notifications           |
| Yellow  | `#FFD60A` | Stars, favorites                |
| Indigo  | `#5E5CE6` | Deep actions                    |

### Claude Brand

```
Primary:  #D4A574  — Claude's warm amber
Hover:    #E0B88A  — Lighter variant
Background: rgba(212, 165, 116, 0.08) — Subtle tint
```

## Glass Effects

### Backdrop Filter Stack

The signature glass effect combines blur and saturation:

```css
backdrop-filter: blur(24px) saturate(180%);
-webkit-backdrop-filter: blur(24px) saturate(180%);
```

Four blur intensities for different contexts:

| Intensity | Value | Usage                        |
|-----------|-------|------------------------------|
| Light     | 12px  | Subtle depth (bookmarks)     |
| Medium    | 24px  | Standard surfaces            |
| Heavy     | 40px  | Search bar, toolbars         |
| Ultra     | 64px  | Modals, context menus        |

### Surface Highlights

Every glass surface includes a subtle top highlight for the "glass edge" effect:

```css
/* Inner top edge highlight */
.glass-surface::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent,
    rgba(255, 255, 255, 0.06),
    transparent
  );
}
```

### Surface Shadow

Elevated surfaces cast shadows proportional to their elevation:

```
Level 1: 0 2px 8px rgba(0, 0, 0, 0.25)
Level 2: 0 8px 24px rgba(0, 0, 0, 0.35)
Level 3: 0 16px 48px rgba(0, 0, 0, 0.45)
Level 4: 0 24px 64px rgba(0, 0, 0, 0.55)
```

## Border Radii

Apple's capsule language — everything is rounded:

| Token      | Value  | Usage                              |
|------------|--------|------------------------------------|
| `xs`       | 4px    | Small inline elements              |
| `sm`       | 8px    | Buttons, inputs, tab items         |
| `md`       | 12px   | Cards, panels                      |
| `lg`       | 16px   | Large cards, article tiles         |
| `xl`       | 20px   | Modals, popovers                   |
| `2xl`      | 28px   | Featured elements                  |
| `pill`     | 100px  | Search bar, chips, toggles         |

## Typography

### Font Stack

```css
/* Display (headings) */
-apple-system, BlinkMacSystemFont, 'SF Pro Display',
'Segoe UI Variable Display', 'Helvetica Neue', sans-serif

/* Text (body) */
-apple-system, BlinkMacSystemFont, 'SF Pro Text',
'Segoe UI Variable Text', 'Helvetica Neue', sans-serif

/* Monospace */
'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace
```

### Scale

| Token  | Size | Weight   | Usage                    |
|--------|------|----------|--------------------------|
| `xs`   | 11px | 500      | Badges, labels           |
| `sm`   | 13px | 400      | Body text, tab titles    |
| `base` | 15px | 400      | Primary body             |
| `lg`   | 17px | 600      | Section headers          |
| `xl`   | 20px | 600      | Page titles              |
| `2xl`  | 24px | 700      | Feature headers          |

## Motion

### Easing Curves

| Curve    | CSS                                    | Usage                |
|----------|----------------------------------------|----------------------|
| Default  | `cubic-bezier(0.25, 1, 0.5, 1)`       | Most transitions     |
| Spring   | `cubic-bezier(0.34, 1.56, 0.64, 1)`   | Toggles, bouncy UI   |
| Smooth   | `cubic-bezier(0.4, 0, 0.2, 1)`        | Fades, opacity        |

### Duration Scale

| Token    | Value | Usage                          |
|----------|-------|--------------------------------|
| Instant  | 80ms  | Press feedback                 |
| Fast     | 150ms | Hover states, micro-animations |
| Normal   | 250ms | Panel transitions, cards       |
| Slow     | 400ms | Modal entry, major transitions |
| Slower   | 600ms | Background image crossfade     |

## Component Reference

### Toggle Switch (Apple-style)

```
OFF: ╭──────────────╮    ON: ╭──────────────╮
     │ ◉            │         │            ◉ │
     ╰──────────────╯         ╰──────────────╯
     bg: white 10%            bg: #30D158
```

Width: 51px, Height: 31px, Knob: 27px diameter

### Capsule Chip

```
╭────────────────╮
│  Topic Name    │
╰────────────────╯

Default:  bg: white 6%, border: white 8%, text: secondary
Active:   bg: blue 20%, border: blue 40%, text: blue
```

### Article Card

```
╭──────────────────╮
│                  │
│   [Poster Image] │  160px height, object-fit: cover
│                  │
│──────────────────│
│ PUBLISHER        │  11px, uppercase, teal
│ Headline text    │  15px, semibold, 3 lines max
│ that wraps...    │
│                  │
│ 2 hours ago      │  12px, tertiary
╰──────────────────╯

radius: 16px, glass surface level 1
hover: translateY(-3px) + shadow-lg
```

### Bookmark Tile

```
    ╭──────────╮
    │          │
    │   [📎]   │  36x36 favicon container
    │          │
    │  Label   │  11px, secondary
    ╰──────────╯

radius: 20px, glass surface level 1
hover: translateY(-2px) scale(1.03)
```
