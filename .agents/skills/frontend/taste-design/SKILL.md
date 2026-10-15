---
name: taste-design
description: Enforces high-taste visual design standards, anti-slop aesthetic mandates, curated dark slate and warm neutral palettes, editorial typography pairing, and asymmetric bento grid layouts.
---

# Taste-Driven Visual Design Framework

The `taste-design` skill enforces uncompromising visual excellence across all user interfaces in SupportGeniusAI. It guarantees that our applications look like bespoke digital products crafted by world-class design studios, completely purging generic "AI-generated SaaS slop."

---

## 1. The Anti-Slop Directive

Generic AI generators produce repetitive, derivative designs that instantly signal low engineering rigor. The following patterns are strictly banned:

### Prohibited Aesthetic Failures ("The Slop Catalog")
1. **The Neon Indigo/Purple Gradient Trap**:
   - ❌ `background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%)` slapped onto heroes, buttons, and card borders.
   - ❌ Over-saturated neon blurs positioned behind generic headline containers.
2. **The Cliché Centered 3-Card SaaS Grid**:
   - ❌ Three identically sized, centered floating cards with a generic icon inside a circle, a short title, 2 lines of text, and a rounded pill button.
3. **The Uncurated Default Font Stack**:
   - ❌ Relying on browser-default sans-serif or raw, un-tracked Inter with zero typographic personality or editorial rhythm.
4. **Glow Overkill**:
   - ❌ Blinding box-shadows (`box-shadow: 0 0 50px rgba(99, 102, 241, 0.6)`) that destroy readability and strain user focus.
5. **Floating 3D Claymorphism / Glossy Spheres**:
   - ❌ Meaningless 3D geometric blobs floating in the viewport that convey no information.

---

## 2. Curated Color Philosophy

SupportGeniusAI uses a high-contrast, low-fatigue architectural palette based on the **60-30-10 Rule**:
- **60% Dominant Base**: Deep charcoal, obsidian, and dark slate backgrounds with subtle warm undertones.
- **30% Structural Neutral**: Layered surface cards, warm zinc dividers, borders, and contextual containers.
- **10% Intentional Accent**: High-voltage surgical accents applied solely to active states, focus rings, primary calls-to-action, and critical data spikes.

### Production CSS Design Tokens

```css
:root {
  /* 60% Dominant Canvas (Deep Obsidian & Charcoal) */
  --canvas-base: #090d16;
  --canvas-subtle: #0d121f;
  --canvas-elevated: #131927;
  
  /* 30% Structural Surfaces & Warm Neutrals */
  --surface-card: #182032;
  --surface-hover: #1f293d;
  --surface-active: #26334d;
  
  --border-subtle: rgba(255, 255, 255, 0.07);
  --border-strong: rgba(255, 255, 255, 0.16);
  --border-highlight: rgba(255, 255, 255, 0.28);

  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --text-inverse: #090d16;

  /* 10% Intentional Accents (Surgical & Purposeful) */
  --accent-amber: #f59e0b;
  --accent-amber-glow: rgba(245, 158, 11, 0.18);
  --accent-emerald: #10b981;
  --accent-cyan: #06b6d4;
  --accent-danger: #ef4444;

  /* Ambient Grain & Depth */
  --grain-overlay: radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.05) 0%, transparent 60%);
  --shadow-subtle: 0 4px 20px -2px rgba(0, 0, 0, 0.5);
  --shadow-layered: 0 12px 36px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px var(--border-subtle);
}
```

---

## 3. Strict Typographic Hierarchy

Typography must convey both editorial authority and engineering precision. We achieve this by pairing an **editorial display typeface** with a **high-legibility geometric/monospace typeface** for data and operational controls.

### Font Pairing Strategy
- **Display Headlines**: `Cabinet Grotesk`, `Syne`, or `Clash Display` — bold, tight tracking, editorial cadence.
- **Body & Interface**: `Plus Jakarta Sans`, `Inter Variable`, or `Space Grotesk` — optimized for high-density readability.
- **Code, Metrics & Telemetry**: `JetBrains Mono` or `Fira Code` — tabular numbers, explicit code semantics.

### Typographic Scale Tokens

```css
/* Typography Scale */
--font-display: "Cabinet Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-body: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", monospace;

--text-display: 3.75rem;    /* 60px */
--text-h1: 2.75rem;         /* 44px */
--text-h2: 2rem;            /* 32px */
--text-h3: 1.5rem;          /* 24px */
--text-body-lg: 1.125rem;   /* 18px */
--text-body: 1rem;          /* 16px */
--text-body-sm: 0.875rem;   /* 14px */
--text-caption: 0.75rem;    /* 12px */

--leading-tight: 1.1;
--leading-snug: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.65;

--tracking-tighter: -0.04em;
--tracking-tight: -0.02em;
--tracking-normal: 0em;
--tracking-wide: 0.05em;
```

### Application Rule
```css
h1.hero-title {
  font-family: var(--font-display);
  font-size: var(--text-display);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tighter);
  font-weight: 800;
  color: var(--text-primary);
}

.metric-value {
  font-family: var(--font-mono);
  font-feature-settings: "tnum" 1, "zero" 1;
  letter-spacing: var(--tracking-tight);
}
```

---

## 4. Asymmetric Bento Grid Layouts

Standard layouts bore users. SupportGeniusAI enforces asymmetric, information-dense bento grids that reflect varied data weights.

```
┌───────────────────────────────────────────────┬──────────────────────────────┐
│  Featured Intelligent Copilot Node (Col 8)    │ Real-time Telemetry (Col 4)  │
│  [Deep Interactive Canvas / Live Graph]       │ [Sparklines & Status]        │
├───────────────────────┬───────────────────────┼──────────────────────────────┤
│ Response Velocity     │ Routing Accuracy      │ Incident Deflection Rate     │
│ (Col 4)               │ (Col 4)               │ (Col 4)                      │
└───────────────────────┴───────────────────────┴──────────────────────────────┘
```

### Production CSS Implementation

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.5rem;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

.bento-card {
  position: relative;
  background-color: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-radius: 1rem;
  padding: 2rem;
  overflow: hidden;
  box-shadow: var(--shadow-layered);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1), 
              border-color 300ms ease, 
              background-color 300ms ease;
}

.bento-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
  background-color: var(--surface-hover);
}

/* Asymmetric Column Spans */
.bento-card.col-8 {
  grid-column: span 8;
}

.bento-card.col-4 {
  grid-column: span 4;
}

.bento-card.col-6 {
  grid-column: span 6;
}

.bento-card.col-12 {
  grid-column: span 12;
}

@media (max-width: 1024px) {
  .bento-card.col-8,
  .bento-card.col-4,
  .bento-card.col-6 {
    grid-column: span 12;
  }
}
```

---

## 5. Architectural Checklist for Reviewing UI Changes

Before committing any frontend component, verify:
- [ ] No generic purple-to-indigo gradient cards or buttons exist.
- [ ] Base background utilizes deep obsidian or dark slate (`#090D16` / `#0D121F`), not flat `#000000` or washed-out `#222222`.
- [ ] Accents are applied surgically: less than 10% total screen surface.
- [ ] Typography pairs an editorial display face for headings with high-legibility geometric/monospace fonts for telemetry.
- [ ] Tabular data and numerical values render with tabular numerals (`font-feature-settings: "tnum" on`).
- [ ] Bento grids exhibit asymmetric weights rather than homogeneous card triplets.
- [ ] Hover states use spring physics (`cubic-bezier(0.16, 1, 0.3, 1)`) and GPU-accelerated transforms (`transform`, `opacity`).
