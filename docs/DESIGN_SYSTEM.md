# Design System

## Brand tokens (single source of truth)
- `primary`: `#11CDDE`
- `accent/contrast`: `#FD7C6F`
- `surface`: `#FFFFFF`
- Extended UI tokens (ink, muted text, border, layout widths, shadows) now live in:
  - `apps/web/src/theme/index.ts`

All theme tokens must be defined only in `apps/web/src/theme/index.ts` and referenced through the exported MUI theme.

## Typography
- Base: `Plus Jakarta Sans, Noto Sans SC, Noto Sans Bengali, sans-serif`
- Hierarchy:
  - H1/H2: high contrast and compact line-height.
  - Body: 16px default, 1.5 line-height.
  - Caption/meta: 12-14px.

## Spacing
- 4px base scale (4, 8, 12, 16, 24, 32, 40, 48).
- Keep mobile-first spacing with progressive expansion at larger breakpoints.

## Responsive rules
- Mobile-first from 320px.
- Breakpoints: xs (0), sm (600), md (900), lg (1200), xl (1536).
- Required layouts:
  - Mobile: single-column, touch-first controls.
  - Tablet: mixed two-column sections where useful.
  - Desktop: multi-column dashboards and dense data views.

## Component usage
- Prefer MUI primitives with wrapped design-system components for repeated patterns.
- Reusable components to establish early:
  - localized navigation shell
  - notice ticker
  - contained hero carousel
  - job card
  - filter panel
  - status badge
  - empty state and error state blocks
