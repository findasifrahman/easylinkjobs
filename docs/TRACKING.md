# Tracking plan

## Goals
- Support anonymous and logged-in users.
- Enable marketing pixel compatibility and first-party server-side events.
- Preserve privacy and consent controls.

## Identity model
- `anonymous_id`: analytics cookie generated only after analytics consent.
- `user_id`: attached post-login and linked to existing anonymous trail.
- `session_id`: session-scoped browser ID generated only after analytics consent.

## Consent gating
- Consent is stored in `localStorage` and mirrored in a cookie via `easylinkjobs_cookie_consent`.
- Locale acknowledgement is stored as `easylinkjobs_cookie_consent_seen_<locale>`.
- No tracking requests are sent until analytics consent is enabled.
- Marketing pixel placeholders stay disabled unless marketing consent is enabled.

## Event flow
1. Client checks consent before emitting any event.
2. If analytics consent is enabled, the web app creates `anonymous_id` and `session_id` if missing.
3. Web forwards events to the API tracking endpoint (server-side collection).
4. API validates and writes normalized event records.
5. Optional fan-out to external analytics/pixels only happens behind consent.

## Pixel + server strategy
- Browser pixel for ad platform parity.
- Server events for reliability and ad-block resilience.
- Deduplication keys across browser/server channels.

## Minimum event schema
- `event_name`
- `event_time`
- `anonymous_id`
- `user_id` (nullable)
- `session_id`
- `path`
- `locale`
- `properties` (structured JSON)
