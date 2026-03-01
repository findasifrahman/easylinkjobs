# Web UI Structure

## App Router shape
- Root redirect: `apps/web/src/app/page.tsx` -> `/en`
- Locale shell: `apps/web/src/app/[locale]/layout.tsx`
- Public pages:
  - home: `apps/web/src/app/[locale]/page.tsx`
  - jobs: `apps/web/src/app/[locale]/jobs/...`
  - companies: `apps/web/src/app/[locale]/companies/...`
- Auth:
  - `apps/web/src/app/[locale]/login/page.tsx`
  - `apps/web/src/app/[locale]/signup/page.tsx`
- Dashboards:
  - redirect: `apps/web/src/app/[locale]/dashboard/page.tsx`
  - candidate/company/admin subpages

## Shared shell
- Navbar + footer are centralized in:
  - `apps/web/src/components/shell/AppShell.tsx`
- This shell wraps every locale route and contains:
  - tracking provider
  - cookie consent banner
  - global chatbot widget

## Theme
- Single source of truth:
  - `apps/web/src/theme/index.ts`
- Change colors, widths, typography, spacing, and component defaults there only.

## Tracking
- Client tracking lives in:
  - `apps/web/src/components/tracking/TrackingProvider.tsx`
- Consent state lives in:
  - `apps/web/src/lib/consent.ts`
- Banner lives in:
  - `apps/web/src/components/shell/ConsentBanner.tsx`
- Responsibilities:
  - do not send events until analytics consent is enabled
  - create `anonymous_id` only after analytics consent
  - persist `session_id` in `sessionStorage` only after analytics consent
  - send events to `/v1/tracking/events`
  - keep pixel placeholders behind marketing consent

## Home page components
- Notice ticker:
  - `apps/web/src/components/home/NoticeTicker.tsx`
- Contained carousel:
  - `apps/web/src/components/home/JobCarousel.tsx`
- Job cards:
  - `apps/web/src/components/home/JobCard.tsx`
- Search filter interaction:
  - `apps/web/src/components/home/JobsFilterBar.tsx`

## i18n
- Dictionaries:
  - `apps/web/src/i18n/en.json`
  - `apps/web/src/i18n/zh.json`
  - `apps/web/src/i18n/bn.json`
- Loader and locale guard:
  - `apps/web/src/lib/i18n.ts`

## Layout rules
- Use MUI `Container` and `Grid2`.
- Theme-level container width is capped to avoid excessive desktop whitespace.
- Carousel stays inside the main container, never edge-to-edge.
- Hero content prioritizes dense above-the-fold information on desktop.
