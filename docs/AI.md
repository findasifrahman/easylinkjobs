# AI

## Scope
- Candidate-side AI CV generation
- Site-wide chatbot widget
- LLM-ready export endpoints for candidate profiles and jobs

## BYOK model
- Users bring their own OpenAI API key.
- Two supported modes:
  - per-request only: send the key for a single CV generation run
  - stored key: user explicitly chooses to store the key for reuse

## Key storage
- Stored keys are encrypted at rest before being written to the database.
- Encryption uses a server-side symmetric key derived from:
  - `FIELD_ENCRYPTION_KEY`, if provided
  - otherwise `JWT_SECRET` as a fallback
- Users can delete the stored key through the UI or API.

## Privacy rules
- CV generation uses the candidate's structured profile export.
- No candidate data is sent to OpenAI unless the user triggers generation.
- Chatbot endpoint is currently a local stub and does not call an external LLM.

## Cost control
- CV generation uses a small model target (`gpt-4o-mini` in the current implementation).
- Request settings are constrained:
  - low temperature
  - bounded output tokens
- Chat remains stubbed until retrieval and stronger budgeting are added.
- Current safeguards:
  - per-user daily CV generation limit (`AI_CV_DAILY_LIMIT`)
  - AI usage events stored for metering
  - local retrieval chat before any future full LLM chat rollout

## API endpoints
- `POST /v1/ai/keys/openai`
- `DELETE /v1/ai/keys/openai`
- `POST /v1/ai/cv/generate`
- `POST /v1/ai/chat`
- `GET /v1/ai/export/candidate-profile`
- `GET /v1/ai/export/jobs/{job_id}`

## Current limitations
- Chat uses lightweight retrieval over jobs, blog posts, and tutorials instead of a full RAG stack.
- CV generation is synchronous.
- No usage metering dashboard yet.
