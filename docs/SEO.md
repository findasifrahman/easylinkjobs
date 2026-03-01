# SEO

## Public indexing rules
- Public pages are indexable:
  - home
  - jobs list and job detail
  - companies
  - blog list and detail
  - tutorials list and detail
  - SEO landing pages under:
    - `/[locale]/jobs/in/[city]`
    - `/[locale]/jobs/visa/[visa-type]`
    - `/[locale]/jobs/nationality/[country]`
- Dashboard pages are explicitly `noindex, nofollow`.

## Technical controls
- `sitemap.xml` includes:
  - static public routes
  - dynamic job routes
  - dynamic company routes
  - dynamic blog routes
  - dynamic tutorial routes
- `robots.txt` allows public pages and disallows dashboard surfaces.
- Locale pages use canonical paths and locale alternates.

## Job SEO
- Job detail pages are SSR.
- Job detail pages include `schema.org/JobPosting` JSON-LD.
- Job pages surface:
  - title
  - company
  - location
  - salary
  - eligibility details

## Content SEO
- Blog and tutorial content is published through admin and rendered on public SSR routes.
- R2-hosted images and videos can be uploaded through the admin dashboard and embedded into content using public URLs.

## Checklist
- Keep route metadata titles and descriptions specific.
- Keep public pages reachable without authentication.
- Keep dashboards and admin UI blocked from indexing.
- Prefer stable slugs for blog, tutorials, and companies.
- Keep sitemap generation resilient if the API is temporarily unavailable.
