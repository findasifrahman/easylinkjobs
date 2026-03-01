# R2 Bucket CORS

Direct browser uploads to Cloudflare R2 use a presigned `PUT` URL. That means the R2 bucket itself must allow the web origin. FastAPI CORS settings do not affect this.

## Required bucket CORS rule

For the `easylinkjobs` bucket, add a CORS rule with:

- Allowed origins:
  - `http://localhost:3000`
  - `https://your-production-web-domain.com`
- Allowed methods:
  - `PUT`
  - `GET`
  - `HEAD`
- Allowed headers:
  - `*`
- Expose headers:
  - `ETag`
- Max age seconds:
  - `3600`

## Why this is required

The browser sends a preflight `OPTIONS` request before uploading to the presigned URL. If the bucket does not return `Access-Control-Allow-Origin`, the browser blocks the upload before the request body is sent.

Typical browser error:

- `No 'Access-Control-Allow-Origin' header is present on the requested resource`

## Current app-side upload rules

- Max file size for all uploads: `1 MB`
- Candidate documents:
  - PDF or image only
- Candidate profile photo:
  - image only

These rules are enforced both:

- in the web UI before upload
- in the API when generating the presigned URL

## Local verification

1. Start the web app at `http://localhost:3000`
2. Try a candidate document upload
3. If the browser still fails on the R2 URL preflight, the bucket CORS rule is still missing or incomplete

## Regression rule

If direct browser uploads fail with a CORS error, check bucket CORS first. Do not debug FastAPI CORS until the R2 bucket rule has been verified.
