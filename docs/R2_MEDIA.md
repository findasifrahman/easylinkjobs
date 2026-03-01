# R2 Media Flow

## Purpose
Candidate documents and other uploaded assets are stored in Cloudflare R2. The database stores metadata and access rules only.

## Signed upload flow
1. Authenticated client calls:
   - `POST /v1/media/presign`
2. API validates the user and creates a `media_assets` row.
3. API returns:
   - signed PUT URL
   - request headers
   - `asset.id`
4. Client uploads the file directly to R2 using the signed URL.
5. Client links the resulting `asset.id` into a domain record:
   - for candidate docs: `POST /v1/candidate/documents`

## Default security
- Candidate document uploads use `purpose = candidate_document`
- The API forces those assets to `PRIVATE` visibility by default
- Ownership is checked before a media asset can be linked to a candidate document

## Why this shape
- Keeps large file transfer off the API server
- Avoids proxying binary uploads through FastAPI
- Preserves strict metadata and ACL control in Postgres
- Supports future virus scanning or moderation pipelines

## Current endpoints
- `POST /v1/media/presign`
- `POST /v1/media/signed-upload` (legacy alias)
