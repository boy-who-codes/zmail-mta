---
version: alpha
name: MAILOS-design-system
description: |
  The official visual and interaction design specification for MAILOS (Enterprise Email
  Infrastructure Platform). Combines Linear's dense, high-precision dark canvas (#010102
  with 4-step surface ladder and hairline borders), Resend's clean developer-first typography
  and Geist Mono code windows, and Superhuman's deliberate speed-oriented keyboard workflows.
  Features a rare, subtle signature accent (#ff69b4 - Hot Pink / Aurora Blush) reserved for
  microscopic heartbeat indicators, favorite entity markers, and milestone celebrations.

colors:
  # Primary brand & surfaces (Linear dark foundation)
  canvas: "#010102"
  surface-1: "#0f1011"
  surface-2: "#141516"
  surface-3: "#18191a"
  surface-4: "#191a1b"
  
  # Structural borders & hairlines
  hairline: "#23252a"
  hairline-strong: "#34343a"
  hairline-tertiary: "#3e3e44"
  hairline-translucent: "rgba(255, 255, 255, 0.06)"
  hairline-translucent-strong: "rgba(255, 255, 255, 0.14)"

  # Typography ink
  ink: "#f7f8f8"
  ink-muted: "#d0d6e0"
  ink-subtle: "#8a8f98"
  ink-tertiary: "#62666d"

  # Core brand accents
  primary: "#5e6ad2"
  primary-hover: "#828fff"
  primary-focus: "#5e69d1"
  on-primary: "#ffffff"

  # Rare signature accent (Easter egg & subtle high-tier highlights)
  accent-blush: "#ff69b4"
  accent-blush-subtle: "rgba(255, 105, 180, 0.12)"
  accent-blush-glow: "rgba(255, 105, 180, 0.22)"
  accent-blush-border: "rgba(255, 105, 180, 0.35)"

  # Operational & deliverability semantics
  semantic-success: "#27a644"
  semantic-success-glow: "rgba(39, 166, 68, 0.20)"
  semantic-warning: "#ffc53d"
  semantic-warning-glow: "rgba(255, 197, 61, 0.20)"
  semantic-error: "#ff2047"
  semantic-error-glow: "rgba(255, 32, 71, 0.24)"
  semantic-info: "#3b9eff"
  semantic-info-glow: "rgba(59, 158, 255, 0.20)"

typography:
  display-xl:
    fontFamily: Inter, SF Pro Display, -apple-system, sans-serif
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.10
    letterSpacing: -1.8px
  headline:
    fontFamily: Inter, SF Pro Display, -apple-system, sans-serif
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: -0.6px
  card-title:
    fontFamily: Inter, SF Pro Display, -apple-system, sans-serif
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.4px
  body:
    fontFamily: Inter, -apple-system, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: -0.05px
  body-sm:
    fontFamily: Inter, -apple-system, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  caption:
    fontFamily: Inter, -apple-system, sans-serif
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.40
    letterSpacing: 0.2px
  code-mono:
    fontFamily: Geist Mono, JetBrains Mono, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px

components:
  app-shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
  sidebar:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink-muted}"
    borderRight: "1px solid {colors.hairline}"
  card-metric:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.lg}"
    padding: 20px
  code-window:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.code-mono}"
    border: "1px solid {colors.hairline-strong}"
    rounded: "{rounded.lg}"
    padding: 16px
  heartbeat-dot:
    backgroundColor: "{colors.accent-blush}"
    boxShadow: "0 0 8px {colors.accent-blush-glow}"
    rounded: "{rounded.full}"
    size: 6px
---

# MAILOS Design System Specification

## 1. Visual Foundation

MAILOS is built as a dark, high-density, native-feeling enterprise control plane. Its visual foundation adopts the technical precision of Linear, the typography and code legibility of Resend, and the fast keyboard-driven clarity of Superhuman.

### 1.1 Surface Elevation
- **Canvas (`#010102`)**: Base backdrop for the entire viewport.
- **Surface 1 (`#0f1011`)**: Root navigation sidebar, module headers, and primary content cards.
- **Surface 2 (`#141516`)**: Interactive inputs, table rows, and code blocks.
- **Surface 3 (`#18191a`)**: Modal dialogs, floating popovers, and elevated menus.
- **Surface 4 (`#191a1b`)**: Focus-selected rows, tooltips, and high-priority alerts.

---

## 2. Rare Signature Accent: `#ff69b4` (Hot Pink / Blush Aurora)

> [!IMPORTANT]
> `#ff69b4` is a **rare, deliberate signature color**. It must never be used as a loud background fill, large button, or primary alert banner. Instead, it is used **subtly and sparingly** to create delight, highlight special system milestones, and serve as an elegant Easter egg.

### 2.1 Permitted Placements for `#ff69b4`

1. **Host & Node Synchronization Heartbeat (`heartbeat-dot`):**
   * A tiny 6px live status dot placed beside the Node Agent connection indicator in the footer or node header.
   * Glows with `box-shadow: 0 0 8px rgba(255, 105, 180, 0.22)`.
   * Pulses softly once every 4 seconds to indicate an active, healthy TLS telemetry stream.

2. **Entity Star / Favorite Toggle:**
   * When an operator bookmarks or stars a mission-critical domain, dedicated IP pool, or favorite campaign, the active star icon transitions from `{colors.ink-subtle}` to `{colors.accent-blush}` (`#ff69b4`).

3. **Warmup & Reputation Milestone Celebration:**
   * When a newly warmed IP or domain reaches **100% target volume** or completes its warmup checklist without deferrals, a subtle celebratory 1px border highlight and milestone badge in `{colors.accent-blush}` appears on the completion card.

4. **Sandbox "First Send" Toast & Confetti:**
   * When the operator successfully sends their very first test email through the isolated sandbox capture engine, the confirmation toast includes a subtle `#ff69b4` gradient shimmer (`accent-blush-subtle`).

5. **Keyboard Easter Egg:**
   * In the global command palette (`Cmd + K`), searching for `/heartbeat` or `/gf` reveals a subtle glowing status badge: *"MAILOS Engine Heartbeat — Synced with Love"*, highlighted with `#ff69b4`.

---

## 3. Design Rules

- **Do:** Keep `#ff69b4` scarce. When an operator sees it, it should feel intentional, elegant, and special.
- **Do:** Always pair `#ff69b4` with translucent opacity tokens (`accent-blush-subtle: rgba(255, 105, 180, 0.12)`) when used as a pill background.
- **Don't:** Never use `#ff69b4` for error states, destructive buttons, or loud hero blocks.
- **Don't:** Never clash it with primary lavender (`#5e6ad2`) or semantic green (`#27a644`).
