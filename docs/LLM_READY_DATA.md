# LLM-ready data principles

## Why this matters
LLM features (semantic search, recommendations, assistant workflows) perform better when domain data is normalized, structured, and consistently typed.

## Rules
- Prefer normalized relational entities over opaque blobs.
- Keep structured fields for critical attributes (skills, salary ranges, locations, visa sponsorship flags, language requirements).
- Use JSON only for flexible but typed extension fields.
- Maintain stable IDs and timestamps for all records.
- Track provenance/source for imported or AI-augmented content.

## API conventions
- JSON-first APIs with explicit schema contracts.
- Consistent enums and reference tables for predictable model inputs.
- Cursor pagination and filterable endpoints for batch processing.
- Export endpoints for clean downstream AI ingestion:
  - `GET /v1/ai/export/candidate-profile`
  - `GET /v1/ai/export/jobs/{job_id}`

## Future readiness
- Add embedding pipelines later without rewriting core schema.
- Keep audit history for AI-generated edits and moderation decisions.
