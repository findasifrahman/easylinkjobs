# Privacy and Consent

## Placeholder scope
This is a working placeholder for the public privacy surface.

## Current web storage behavior
The web app currently stores the following browser-side values:

- `easylinkjobs_cookie_consent` in `localStorage`
  - stores the current consent preferences JSON: `analytics`, `marketing`
- `easylinkjobs_cookie_consent` cookie
  - mirrors the same consent JSON so the choice persists at browser level
- `easylinkjobs_cookie_consent_seen_<locale>` in `localStorage`
  - records that the consent banner has already been acknowledged for a specific locale route
- `easylinkjobs_access_token` in `localStorage`
  - access token for authenticated API calls
- `easylinkjobs_refresh_token` in `localStorage`
  - refresh token for session renewal

## Tracking-specific identifiers
These identifiers are only created after `analytics = true` consent:

- `anonymous_id` cookie
- `easylinkjobs_session_id` in `sessionStorage`

If analytics consent is not granted:

- no `/v1/tracking/events` requests are sent
- no analytics page views are emitted
- marketing pixel placeholders remain disabled

## Consent model
- `Accept all`: enables analytics + marketing
- `Reject non-essential`: disables analytics + marketing
- `Customize`: stores independent analytics and marketing toggles

## Production follow-up
Replace this placeholder with a legally reviewed privacy notice covering:

- data categories collected
- retention periods
- lawful basis / consent basis
- international data transfers
- document access controls
- user deletion / access rights
