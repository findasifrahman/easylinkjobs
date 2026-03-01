# Ingestion

## Purpose
- Accept daily scraped foreigner-friendly jobs from Clawbot.
- Keep ingestion secure, rate-limited, and traceable.

## Endpoint
- `POST /v1/ingest/jobs`

## Security
- Requires `X-Ingestion-Key`.
- The key must match `INGESTION_API_KEY`.
- Requests are rate-limited by source IP using Redis.

## Payload contract
```json
{
  "jobs": [
    {
      "title": "ESL Teacher - Shanghai",
      "company_name": "Example School",
      "description": "Full job description...",
      "city": "Shanghai",
      "country": "China",
      "province": "Shanghai",
      "source_url": "https://source.example/job/123",
      "visa_sponsorship": true,
      "foreigner_eligible": true,
      "work_permit_support": true,
      "english_required": true,
      "relocation_support": false,
      "housing_provided": false,
      "salary_min": 18000,
      "salary_max": 26000,
      "currency": "CNY",
      "raw_source_snapshot": {
        "source": "facebook",
        "captured_html": "<omitted>"
      },
      "published": true
    }
  ]
}
```

## Deduplication
- First pass:
  - `source_url` SHA-256 hash stored in `jobs.metadata.source_url_hash`
- Fallback:
  - case-insensitive match on `title + company + city`

## Traceability
- Raw scraped payload is stored in `jobs.metadata.raw_source_snapshot`.
- Jobs are marked:
  - `source = SCRAPED`
  - `is_published = true` by default if the payload requests it

## Frontend behavior
- Scraped jobs are surfaced on the homepage in:
  - `Fresh foreigner-friendly jobs today`
  - badge: `Collected`
