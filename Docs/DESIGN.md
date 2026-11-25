# SWADESH Design System & UI Specification

This document details the visual design specifications extracted from Stitch design exports (`/docs/screens`).

---

## 1. Color Palette

The SWADESH design language employs a civic-tech palette rooted in Indian urban public infrastructure tones: Deep Teal, Saffron/Amber accents, and Warm Off-White/Cream surfaces.

### Primary Brand & Theme Colors
| Token | Hex | Tailwind Utility Class | Usage |
|---|---|---|---|
| **Primary** | `#004343` | `bg-primary` / `text-primary` | Main branding, primary buttons, dominant headers |
| **Primary Container** | `#0F5C5C` | `bg-primary-container` | Hero headers, active navigation pills, highlighted cards |
| **Primary Fixed Dim** | `#90D2D1` | `text-primary-fixed-dim` | Inverted text, focus rings, subtle badges |
| **Secondary (Amber/Saffron)**| `#855300` | `text-secondary` | Alert accents, SLA warnings, highlights |
| **Secondary Container** | `#FEA619` | `bg-secondary-container` | Active selection markers, action badges, accent buttons |
| **On Secondary Container** | `#684000` | `text-on-secondary-container`| Text on secondary container |
| **Background / Surface** | `#FCF9F4` | `bg-surface` / `bg-background`| Main application page background |
| **Surface Low** | `#F6F3EE` | `bg-surface-container-low` | Card background, input backgrounds |
| **Surface Lowest** | `#FFFFFF` | `bg-surface-container-lowest`| Elevating card containers, popups, modals |
| **Surface Container High** | `#EBE8E3` | `bg-surface-container-high`| Table header bands, subtle division fills |
| **Outline / Border** | `#6F7978` | `border-outline` | Border outlines, input strokes |
| **Outline Variant** | `#BFC8C8` | `border-outline-variant` | Dividers, subtle borders, card borders |
| **On Surface (Text)** | `#1C1C19` | `text-on-surface` | High-contrast body typography, titles |
| **On Surface Variant (Muted)**| `#3F4948` | `text-on-surface-variant`| Secondary labels, timestamps, metadata |
| **Error** | `#BA1A1A` | `bg-error` / `text-error` | Validation errors, emergency civics warnings |
| **Error Container** | `#FFDAD6` | `bg-error-container` | Emergency notice callout backgrounds |

---

## 2. Typography

- **Font Family:** `Plus Jakarta Sans`, sans-serif
- **Fallback Font:** `system-ui, -apple-system, sans-serif`
- **Icon Set:** Google Material Symbols Outlined (`Material Symbols Outlined`)

### Scale & Hierarchy
- **Display Hero:** `44px / 52px`, weight `800`, letter spacing `-0.03em`
- **Display Hero Mobile:** `32px / 40px`, weight `800`, letter spacing `-0.02em`
- **Headline LG:** `32px / 40px`, weight `700`, letter spacing `-0.02em`
- **Headline MD:** `24px / 32px`, weight `700`, letter spacing `-0.015em`
- **Headline SM:** `20px / 28px`, weight `700`
- **Title MD:** `16px / 24px`, weight `600`
- **Body LG:** `16px / 26px`, weight `400`
- **Body MD:** `14px / 22px`, weight `400`
- **Body SM:** `12px / 18px`, weight `400`
- **Label LG:** `14px / 20px`, weight `600`, letter spacing `0.01em`
- **Label MD:** `12px / 16px`, weight `600`, letter spacing `0.02em`
- **Label SM:** `11px / 14px`, weight `700`, letter spacing `0.04em`

---

## 3. Component Styles & Layout Tokens

- **Border Radius:**
  - Standard cards: `rounded-xl` (`0.75rem` / `12px`)
  - Buttons & Inputs: `rounded-lg` (`0.5rem` / `8px`)
  - Badges & Pills: `rounded-full` (`9999px`)
- **Container Max Width:** `max-w-[1440px]` with desktop gutters `px-6 md:px-10`
- **Status Badge Scheme (aligned with `BLUEPRINT.md`):**
  - `PENDING_VERIFICATION`: Amber / Yellow badge (`bg-amber-100 text-amber-800 border-amber-300`)
  - `VERIFIED`: Blue / Cyan badge (`bg-blue-100 text-blue-800 border-blue-300`)
  - `ASSIGNED`: Purple / Indigo badge (`bg-purple-100 text-purple-800 border-purple-300`)
  - `IN_PROGRESS`: Teal badge (`bg-teal-100 text-teal-800 border-teal-300`)
  - `RESOLVED`: Green badge (`bg-emerald-100 text-emerald-800 border-emerald-300`)
  - `REJECTED`: Gray / Rose badge (`bg-rose-100 text-rose-800 border-rose-300`)

---

## 4. Stitch Screens Inventory

Screens located in [`/docs/screens`](./screens):
1. `01_home_feed.html` & `.png` — Public feed, category filter chips, search, upvote cards
2. `02_report_an_issue.html` & `.png` — Multi-step issue report form, location autodetect, media dropzone
3. `03_my_reports.html` & `.png` — Citizen dashboard with tracking metrics and issue history
4. `04_issue_detail_pothole.html` & `.png` — Granular issue view, SLA clock, status timeline audit log
5. `05_authority_dashboard.html` & `.png` — Authority triage board, department breakdown & SLA metrics
6. `06_login.html` & `.png` — Citizen quick-login vs Authority passcode authentication
7. `07_authority_issue_review.html` & `.png` — Issue verification modal, priority & department routing
8. `08_illustration_street_scene.png` — Visual vector civic editorial hero illustration

