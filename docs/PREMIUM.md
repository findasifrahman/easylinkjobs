# Premium

## Current state
- Premium is scaffolded but dormant.
- Subscription plans, entitlements, and contact gating already exist in the schema.
- No live payment provider is connected yet.

## Core model
- `subscription_plans`
- `subscriptions`
- `entitlements`
- `plan_entitlements`
- `subscription_entitlements`

## Current use
- Company applicant contact visibility checks use entitlements.
- Relevant entitlement codes:
  - `job.contact.view_premium`
  - `company.contact.unlock`

## Provider placeholders
- `GET /v1/billing/plans`
- `GET /v1/billing/providers`

Current placeholder providers:
- `stripe_placeholder`
- `manual_invoice`

## Future payment integration plan
1. Add checkout session creation.
2. Add webhook ingestion for subscription state sync.
3. Map provider events into `subscriptions.external_ref`.
4. Grant and revoke entitlements based on provider-confirmed billing state.

## UX expectation
- Free companies can post jobs and review applicant summaries.
- Premium companies unlock direct candidate contact and future paid workflow upgrades.
