# Candidate Profile Model

## Goal
Support a detailed, future-proof candidate record that works for:
- imported unclaimed profiles
- guided onboarding after signup
- recruiter review
- later integrations with Zhipin/LinkedIn-style enrichment

## Signup minimum
Mandatory signup fields:
- `email`
- `password`
- `full_name`
- `nationality`
- `current_country`

This keeps signup low-friction while still creating a usable candidate record immediately.

## Wizard sections
### 1. Personal
- `full_name`
- `dob`
- `father_name`
- `mother_name`
- `gender` (optional)
- `phone`
- `address` (stored in extensible profile data)
- `nationality`
- `current_country`
- `current_city`

### 2. China history
- `ever_been_to_china`
- `ever_rejected_china`
- `china_education`
- `visa_status`

### 3. Education
- `candidate_educations` entries
- optional education attachments stored as candidate documents (`EDUCATION_DOC`)

### 4. Work experience
- `candidate_experiences`
- `candidate_skills`

### 5. Languages
- `hsk_level`
- `english_proficiency_type`
- English score fields

### 6. Documents
- Passport
- CV
- Cover letter
- Certificates
- Education documents

All documents are stored as `candidate_documents` linked to `media_assets`.

### 7. Preferences
- `desired_job_titles`
- `desired_cities`
- `salary_expectation`
- `salary_currency`

## Completion score
- Calculated server-side after profile mutations.
- Stored in:
  - `candidate_profiles.profile_completion_score`
  - `candidates.profile_completion_score`
- Score is section-based, not raw-field-only, so users are guided to meaningful completion rather than filling trivial fields.

## Sensitive fields
- Passport metadata is sensitive and must only be accessible through candidate-owned authenticated endpoints.
- Media objects for candidate documents default to `PRIVATE`.
