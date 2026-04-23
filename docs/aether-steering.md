# Aether for Chromium: Complete Design & Implementation Steering Document

**Version:** 1.3
**Date:** April 2035
**Status:** Canonical reference for all Chromium patches, forks, experimental features, and AI developer agents
**Audience:** Chromium engineers, patch authors, design reviewers, and anyone building the future of the browser

---

## 1. Vision & Design Intent

In 2035, the web browser is no longer a window framed by persistent chrome. It is an **ambient, intent-driven portal** -- a seamless extension of your mind and the physical world.

**Aether** is Chromium's evolution of Apple's Liquid Glass design system into a fully volumetric, living interface. Persistent tabs, toolbars, omniboxes, and buttons disappear. In their place is a subtle **volumetric field of light and presence** called **ether fields** -- intelligent, refractive, biomorphic light that manifests exactly when and where your intent (gaze, gesture, voice, or neural cue) requires it, then dissolves instantly.

### Core Intent

- **Intent-driven & zero-UI by default**: No always-visible chrome. The interface is invisible until needed.
- **Liquid Light evolved into volumetric presence**: Translucent, refractive, glowing, and responsive to content, environment, and biology.
- **Content-first**: Web pages remain fully interactive and visually dominant. Ether layers float above without competing.
- **Calm & delightful**: Every animation uses the signature Liquid curve `cubic-bezier(0.23, 1, 0.32, 1)` and feels premium.
- **Multimodal & adaptive**: Works with gaze, air gestures, voice, trackpad/keyboard today; neural input tomorrow.
- **Privacy & well-being first**: All intent detection is on-device. The system actively protects focus.

### Everyday Experience in Chromium (2035)

You open Chromium. The screen is almost entirely your content -- clean and serene.

- Glance toward the top edge -> a faint golden **ether field** appears with your **Constellation Tabs** (live 3D previews of up to 8 tabs orbiting gently).
- Dwell gaze or gesture on a card -> it blooms forward and expands into full view with liquid-light animation.
- Voice "open Gmail" or neural cue -> current page dissolves with refractive trails while Gmail materializes.
- In flow -> Aether fades further, leaving only pure content and the faintest breathing glow.

Aether turns Chromium into a calm, magical partner that feels like the breath of intelligence helping you engage with the web.

**Gold-standard visual reference**: The [8-site Constellation Prototype HTML](https://gist.github.com/grok/aether-constellation-8-real) (Fox News, YouTube, Wikipedia, Amazon AirPods, Delta flight search, Gmail, Nordstrom Frame Jeans, Apple.com). Every patch must match this prototype in motion, glow, dimensions, and feel.

---

## 2. Design Principles

All patches must strictly follow these rules:

1. **Intent-Driven & Zero-UI by Default**
2. **Liquid Light Material** (detailed below)
3. **Content-First Hierarchy**
4. **Calm & Delightful Motion**
5. **Multimodal & Adaptive**
6. **Privacy & Well-Being First**

---

## 3. Liquid Light Material System -- Exhaustive Specifications

### 3.1 Color Palettes (OKLCH + hex)

#### Light Mode -- Golden Hour (Default)

| Token               | OKLCH                  | Hex       |
|----------------------|------------------------|-----------|
| Ether Base Glow      | `oklch(92% 0.08 85)`  | `#FFEBB8` |
| Ether Accent         | `oklch(78% 0.18 78)`  | `#FFCC66` |
| Ether Deep Glow      | `oklch(65% 0.12 92)`  | `#E8B866` |
| Background Ether     | `oklch(95% 0.01 240)` | `#F8F8F8` |
| Card Backdrop        | `oklch(92% 0.01 240)` | `#F4F4F4` (72% opacity) |
| Text Primary         | `oklch(18% 0.02 240)` | `#1C1C1E` |
| Text Secondary       | `oklch(45% 0.02 240)` | `#666666` |

#### Dark Mode -- Aether Night

| Token               | OKLCH                  | Hex       |
|----------------------|------------------------|-----------|
| Ether Base Glow      | `oklch(78% 0.09 85)`  | `#D4B366` |
| Ether Accent         | `oklch(65% 0.15 78)`  | `#C9A14F` |
| Background           | `oklch(12% 0.02 240)` | `#1C1C1E` |
| Card Backdrop        | `oklch(18% 0.02 240)` | `#2A2A2E` (72% opacity) |
| Text Primary         | `oklch(95% 0.01 240)` | `#F8F8F8` |

#### CSS Custom Properties (mandatory)

```css
--aether-ether-base: oklch(92% 0.08 85);
--aether-accent: oklch(78% 0.18 78);
--aether-backdrop: rgba(248, 248, 248, 0.40);
--aether-card-backdrop: rgba(244, 244, 244, 0.72);
--aether-glow-intensity: 1.0;
```

### 3.2 Material Properties

| Layer              | Backdrop Blur | Opacity | Refraction | Glow Spread     | Corner Radius | Border                              |
|--------------------|---------------|---------|------------|-----------------|---------------|--------------------------------------|
| Ether Field (base) | 24 px         | 38%     | 1.42       | 48 px           | 28 px         | 1 px solid rgba(255,235,184,0.3)    |
| Card Backdrop      | 18 px         | 72%     | 1.38       | 32 px           | 24 px         | none                                 |
| Glow Ring          | 0 px          | 35%     | --         | Additive + 24 px| 50% (circular)| none                                 |
| Omnibox Pill       | 32 px         | 42%     | 1.45       | 64 px           | 9999 px       | 1.5 px solid accent @ 30%           |

#### WebGPU Shader Parameters (exact)

```
u_refractionStrength: 0.42
u_causticsIntensity:  0.18
u_breathingSpeed:     0.8 Hz
u_glowFalloff:        2.4
u_edgeHighlight:      0.6 (base) -> 1.2 (intent)
```

### 3.3 Typography

| Role           | Font                    | Size   | Weight |
|----------------|-------------------------|--------|--------|
| Primary        | Aether Sans Variable    | --     | --     |
| Card Title     | Aether Sans Variable    | 24 px  | 600    |
| Preview Meta   | Aether Sans Variable    | 13 px  | 500    |
| Omnibox Input  | Aether Sans Variable    | 17 px  | 400    |

Register `Aether Sans Variable` in Chromium's font system.

### 3.4 Motion Language

| Property         | Value                                  |
|------------------|----------------------------------------|
| Universal easing | `cubic-bezier(0.23, 1, 0.32, 1)`      |
| Appear/Bloom     | 220 ms                                 |
| Dissolve         | 160 ms                                 |
| Selection scale  | 180 ms                                 |
| Breathing        | 1200 ms ease-in-out                    |

---

## 4. Key Components & Exact Specifications

### 4.1 Aether Constellation Tabs (Replacement for TabStrip)

#### Layout

- Max 8 cards in elliptical arc (radius 520 px or 5.2 WebGL units)
- Card size: 280 px x 175 px (source texture 640 x 400 px)
- Angular spacing: `(i - 3.5) * 0.55` radians
- Card tilt: `rotation.y = angle * 0.25`
- Vertical breathing: `sin(time / 900 + i) * 0.09`

#### Visual Specs

- Corner radius: 24 px
- Backdrop: 72% opacity + 18 px blur
- Glow ring: 155-165 px radius, 35% opacity, additive blend

#### Behavior

- Gentle auto-orbit: +0.0006 rad/frame
- Selection: scale 1.0 -> 1.45 (180 ms) then settle

#### Implementation

- Add flag `AetherConstellationTabs`
- Create `AetherTabRenderer` using WebGPU + live textures from `TabStripModel`
- Use the exact shader from Section 5 below

#### Evaluation

- Must match the 8-site prototype exactly in motion, glow, and live previews.

### 4.2 Ether Omnibox

#### Specs

- Pill shape, height 56 px, width 480 px (expands to 620 px)
- Backdrop: 42% opacity + 32 px blur
- Appears at top-center on gaze dwell (top 15% of screen, 200 ms) or voice intent

#### Implementation

- Hide classic `OmniboxView` behind flag
- Use WebUI + CSS custom properties

### 4.3 General Ether Fields & Overlays

- Base blur 24 px, opacity 38%
- Corner radius 28 px (fields) or 24 px (cards)
- Ether strands: 1.5 px thick, dashed, animated dash-offset

---

## 5. Canonical Liquid Light WebGPU Shader (WGSL)

```wgsl
// Aether Liquid Light -- WebGPU Fragment Shader

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@group(0) @binding(0) var baseTexture: texture_2d<f32>;
@group(0) @binding(1) var baseSampler: sampler;

@group(1) @binding(0) var<uniform> uniforms: AetherUniforms;

struct AetherUniforms {
    time: f32,
    refractionStrength: f32,      // 0.42
    causticsIntensity: f32,       // 0.18
    breathingSpeed: f32,          // 0.8
    glowFalloff: f32,             // 2.4
    glowIntensity: f32,
    edgeHighlight: f32,
    baseColor: vec4<f32>,
    accentColor: vec4<f32>,
    opacity: f32,
    isRing: u32,
};

@fragment
fn fragment(in: VertexOutput) -> @location(0) vec4<f32> {
    var uv = in.uv;
    let breath = sin(uniforms.time * uniforms.breathingSpeed * 6.283185) * 0.08 + 1.0;
    let pulseOpacity = uniforms.opacity * breath;

    var color = textureSample(baseTexture, baseSampler, uv);
    color *= uniforms.baseColor;

    // Refraction
    let refractOffset = (sin(uv * 12.0 + uniforms.time * 2.0) * 0.008) * uniforms.refractionStrength;
    let refractedUV = uv + refractOffset;
    var refractedColor = textureSample(baseTexture, baseSampler, refractedUV);
    refractedColor = mix(color, refractedColor, 0.35);

    // Caustics
    let caustics = sin((uv.x + uv.y) * 24.0 + uniforms.time * 3.0) * uniforms.causticsIntensity;
    refractedColor.rgb += caustics * uniforms.accentColor.rgb;

    // Edge + Glow
    let edge = 1.0 - smoothstep(0.0, 0.15, min(uv.x, min(uv.y, min(1.0-uv.x, 1.0-uv.y))));
    let edgeGlow = edge * uniforms.edgeHighlight * uniforms.glowIntensity;
    let distFromCenter = length(uv - vec2<f32>(0.5, 0.5));
    let glow = pow(1.0 - distFromCenter, uniforms.glowFalloff) * uniforms.glowIntensity;

    var finalColor = refractedColor;
    finalColor.rgb += edgeGlow * uniforms.accentColor.rgb;
    finalColor.rgb += glow * uniforms.baseColor.rgb * 0.6;

    if (uniforms.isRing == 1u) {
        finalColor = vec4<f32>(uniforms.accentColor.rgb, glow * pulseOpacity * 0.35);
        finalColor.rgb *= 1.8;
    }

    finalColor.a *= pulseOpacity;
    return finalColor;
}
```

---

## 6. Adoption & Implementation Guide

### Phased Roadmap

| Phase | Scope |
|-------|-------|
| **Phase 0 (MVP)** | Constellation Tabs behind flag using the prototype + shader |
| **Phase 1** | Ether Omnibox + general overlays |
| **Phase 2** | Full multimodal input + spatial content depth |

### Technical Guidelines

- Prefer WebGPU. Fall back to WebGL.
- Performance budget: <= 4 ms per frame.
- Always provide classic UI fallback.
- Test with the 8-site prototype as visual regression baseline.
- Respect `prefers-reduced-motion` and high-contrast modes.

### Code Locations

- New directory: `chrome/browser/ui/aether/` and `components/aether/`
- Shader: `components/aether/shaders/liquid_light.wgsl`

### Strict Do's and Don'ts

| Do | Don't |
|----|-------|
| Match every color, radius, opacity, dimension, and motion curve exactly | Add persistent chrome |
| Provide classic UI fallback behind flags | Break web compatibility |
| Use the canonical shader from Section 5 | Deviate from specs without updating this document |

---

## 7. Evaluation Checklists

### For Constellation Tabs

- [ ] Matches 8-site prototype in size, arc, glow, breathing, and live previews
- [ ] 120 fps on modern hardware
- [ ] Real-time texture updates

### For Ether Omnibox & Overlays

- [ ] Appears/disappears with 220 ms Liquid curve
- [ ] Never crowds content
- [ ] Full accessibility support

### Overall

- [ ] Feels calm, magical, and invisible until needed
- [ ] Preserves Chromium's openness and extensibility

---

> *This document is the single source of truth.*
> *Every patch must reference it. Every reviewer must use the checklists. Every implementation must match the vision, material specs, shader, and prototype.*
>
> *The interface becomes the breath of intelligence helping you engage with the web.*
>
> -- **Aether Design Collective**
