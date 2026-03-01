-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('UNCLAIMED', 'CLAIMED', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CompanyMemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('CHINESE', 'WFOE', 'RO', 'FOREIGN_STARTUP', 'AGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "OrgSize" AS ENUM ('SOLO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "CompanyVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CompanyVerificationDocType" AS ENUM ('BUSINESS_LICENSE', 'TAX_CERTIFICATE', 'LEGAL_REP_ID', 'AUTHORIZATION_LETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "RemotePolicy" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "ContactVisibilityPolicy" AS ENUM ('PUBLIC', 'APPLICANTS_ONLY', 'PREMIUM_ONLY');

-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('DIRECT', 'SCRAPED', 'PARTNER');

-- CreateEnum
CREATE TYPE "JobLanguage" AS ENUM ('ENGLISH', 'CHINESE', 'BENGALI', 'OTHER');

-- CreateEnum
CREATE TYPE "LanguageLevel" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT', 'NATIVE');

-- CreateEnum
CREATE TYPE "ChineseRequiredLevel" AS ENUM ('NONE', 'BASIC', 'INTERMEDIATE', 'HSK4', 'HSK5', 'FLUENT');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('HIGH_SCHOOL', 'DIPLOMA', 'BACHELORS', 'MASTERS', 'PHD', 'OTHER');

-- CreateEnum
CREATE TYPE "EnglishProficiencyType" AS ENUM ('IELTS', 'DUOLINGO', 'SAT', 'GED', 'TOEFL', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'VIEWED', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'FILE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MediaVisibility" AS ENUM ('PRIVATE', 'COMPANY_ONLY', 'PUBLIC');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "LocaleCode" AS ENUM ('en', 'zh', 'bn');

-- CreateEnum
CREATE TYPE "TaxonomyEntityType" AS ENUM ('INDUSTRY', 'FUNCTION', 'CATEGORY');

-- CreateEnum
CREATE TYPE "EntitlementScope" AS ENUM ('USER', 'COMPANY');

-- CreateEnum
CREATE TYPE "AuthSessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ai_key_credentials" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "encrypted_secret" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_ai_key_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "estimated_units" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "status" "AuthSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "company_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "company_type" "CompanyType" NOT NULL DEFAULT 'OTHER',
    "org_size" "OrgSize" NOT NULL DEFAULT 'SMALL',
    "website" TEXT,
    "description" TEXT,
    "city" TEXT,
    "province" TEXT,
    "country" TEXT,
    "verification_status" "CompanyVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_members" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID,
    "title" TEXT,
    "status" "CompanyMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "invited_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "company_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_verification_documents" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "doc_type" "CompanyVerificationDocType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "company_verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "status" "CandidateStatus" NOT NULL DEFAULT 'UNCLAIMED',
    "source" TEXT,
    "profile_completion_score" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_claim_tokens" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "claimed_by_user_id" UUID,
    "claimed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_claim_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_profiles" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "profile_completion_score" INTEGER NOT NULL DEFAULT 0,
    "language_code" TEXT NOT NULL DEFAULT 'en',
    "full_name" TEXT NOT NULL,
    "dob" DATE,
    "father_name" TEXT,
    "mother_name" TEXT,
    "nationality" TEXT,
    "current_country" TEXT,
    "current_city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gender" TEXT,
    "marital_status" TEXT,
    "china_education" BOOLEAN NOT NULL DEFAULT false,
    "ever_been_to_china" BOOLEAN NOT NULL DEFAULT false,
    "ever_rejected_china" BOOLEAN NOT NULL DEFAULT false,
    "hsk_level" INTEGER,
    "english_proficiency_type" "EnglishProficiencyType",
    "english_score_overall" DECIMAL(5,2),
    "english_score_reading" DECIMAL(5,2),
    "english_score_writing" DECIMAL(5,2),
    "english_score_speaking" DECIMAL(5,2),
    "english_score_listening" DECIMAL(5,2),
    "english_score_raw" JSONB,
    "desired_job_titles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "desired_cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "salary_expectation" INTEGER,
    "salary_currency" TEXT DEFAULT 'CNY',
    "visa_status" TEXT,
    "work_permit_status" TEXT,
    "summary" TEXT,
    "extensible_data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_educations" (
    "id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "field_of_study" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "grade" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_experiences" (
    "id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "employment_type" "EmploymentType",
    "start_date" DATE,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "location_city" TEXT,
    "location_country" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_skills" (
    "id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "years_of_experience" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_languages" (
    "id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "language" TEXT NOT NULL,
    "proficiency" TEXT,
    "certification" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_certifications" (
    "id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "issuing_org" TEXT,
    "issued_at" DATE,
    "expires_at" DATE,
    "credential_id" TEXT,
    "credential_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_documents" (
    "id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "media_asset_id" UUID,
    "document_type" TEXT NOT NULL,
    "title" TEXT,
    "language_code" TEXT,
    "issued_at" DATE,
    "expires_at" DATE,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_passports" (
    "id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "passport_number" TEXT,
    "country_code" TEXT,
    "issued_at" DATE,
    "expires_at" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_passports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_test_scores" (
    "id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "test_type" TEXT NOT NULL,
    "score" DECIMAL(8,2),
    "max_score" DECIMAL(8,2),
    "details" JSONB,
    "taken_at" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_test_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industries" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_functions" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "job_functions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "industry_id" UUID NOT NULL,
    "job_function_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "job_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxonomy_translations" (
    "id" UUID NOT NULL,
    "entity_type" "TaxonomyEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "taxonomy_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_tags_catalog" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "job_tags_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_tags" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "category_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language_code" "LocaleCode" NOT NULL DEFAULT 'en',
    "foreigner_eligible" BOOLEAN NOT NULL DEFAULT true,
    "visa_sponsorship" BOOLEAN NOT NULL DEFAULT false,
    "work_permit_support" BOOLEAN NOT NULL DEFAULT false,
    "chinese_required_level" "ChineseRequiredLevel" NOT NULL DEFAULT 'NONE',
    "english_required" BOOLEAN NOT NULL DEFAULT false,
    "relocation_support" BOOLEAN NOT NULL DEFAULT false,
    "housing_provided" BOOLEAN NOT NULL DEFAULT false,
    "experience_years" INTEGER,
    "education_level" "EducationLevel",
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "city" TEXT NOT NULL,
    "province" TEXT,
    "country" TEXT NOT NULL,
    "job_type" "JobType" NOT NULL DEFAULT 'FULL_TIME',
    "remote_policy" "RemotePolicy" NOT NULL DEFAULT 'ONSITE',
    "headcount" INTEGER,
    "application_deadline" TIMESTAMPTZ(6),
    "benefits" JSONB,
    "screening_questions" JSONB,
    "source" "JobSource" NOT NULL DEFAULT 'DIRECT',
    "source_url" TEXT,
    "contact_visibility_policy" "ContactVisibilityPolicy" NOT NULL DEFAULT 'APPLICANTS_ONLY',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_translations" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "language_code" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "job_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_language_requirements" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "language" "JobLanguage" NOT NULL,
    "level" "LanguageLevel" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_language_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_allowed_nationalities" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "nationality_code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_allowed_nationalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_locations" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "country" TEXT NOT NULL,
    "province" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "address" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "candidate_snapshot" JSONB,
    "cover_letter" TEXT,
    "screening_answers" JSONB,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications_archive" (
    "id" UUID NOT NULL,
    "job_id" UUID,
    "candidate_id" UUID,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "candidate_snapshot" JSONB,
    "cover_letter" TEXT,
    "screening_answers" JSONB,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "applications_archive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_events" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "status_from" "ApplicationStatus",
    "status_to" "ApplicationStatus" NOT NULL,
    "event_name" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_notes" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "author_user_id" UUID,
    "body" TEXT NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "application_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "candidate_id" UUID,
    "job_id" UUID,
    "company_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_user_id" UUID,
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "media_asset_id" UUID,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "language_code" TEXT NOT NULL DEFAULT 'en',
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "author_user_id" UUID,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_translations" (
    "id" UUID NOT NULL,
    "blog_post_id" UUID NOT NULL,
    "language_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "author_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "blog_post_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutorials" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "language_code" TEXT NOT NULL DEFAULT 'en',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "author_user_id" UUID,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tutorials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutorial_translations" (
    "id" UUID NOT NULL,
    "tutorial_id" UUID NOT NULL,
    "language_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "author_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tutorial_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "object_key" TEXT NOT NULL,
    "bucket" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum_sha256" TEXT,
    "owner_user_id" UUID,
    "company_id" UUID,
    "visibility" "MediaVisibility" NOT NULL DEFAULT 'PRIVATE',
    "acl" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_events" (
    "id" UUID NOT NULL,
    "event_name" TEXT NOT NULL,
    "session_id" TEXT,
    "anonymous_id" TEXT,
    "user_id" UUID,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "referrer" TEXT,
    "page_url" TEXT,
    "properties" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_events_archive" (
    "id" UUID NOT NULL,
    "event_name" TEXT NOT NULL,
    "session_id" TEXT,
    "anonymous_id" TEXT,
    "user_id" UUID,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "referrer" TEXT,
    "page_url" TEXT,
    "properties" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tracking_events_archive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_daily_aggregates" (
    "id" UUID NOT NULL,
    "metric_date" DATE NOT NULL,
    "metric_key" TEXT NOT NULL,
    "dimensions" JSONB,
    "value" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_daily_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language_code" TEXT NOT NULL DEFAULT 'en',
    "description" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billing_interval" TEXT NOT NULL DEFAULT 'month',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "features" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_translations" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "language_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_plan_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "company_id" UUID,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "trial_ends_at" TIMESTAMPTZ(6),
    "canceled_at" TIMESTAMPTZ(6),
    "external_ref" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "EntitlementScope" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_entitlements" (
    "id" UUID NOT NULL,
    "subscription_plan_id" UUID NOT NULL,
    "entitlement_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_entitlements" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "entitlement_id" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "subscription_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_customers" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "company_id" UUID,
    "provider" TEXT NOT NULL,
    "provider_customer_id" TEXT NOT NULL,
    "email" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_ai_key_credentials_user_id_key" ON "user_ai_key_credentials"("user_id");

-- CreateIndex
CREATE INDEX "ai_usage_events_user_id_action_created_at_idx" ON "ai_usage_events"("user_id", "action", "created_at");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_status_idx" ON "auth_sessions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "user_roles_user_id_company_id_idx" ON "user_roles"("user_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_company_id_key" ON "user_roles"("user_id", "role_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "company_members_user_id_idx" ON "company_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_members_company_id_user_id_key" ON "company_members"("company_id", "user_id");

-- CreateIndex
CREATE INDEX "company_verification_documents_company_id_status_idx" ON "company_verification_documents"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_user_id_key" ON "candidates"("user_id");

-- CreateIndex
CREATE INDEX "candidates_profile_completion_score_idx" ON "candidates"("profile_completion_score");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_claim_tokens_token_key" ON "candidate_claim_tokens"("token");

-- CreateIndex
CREATE INDEX "candidate_claim_tokens_candidate_id_expires_at_idx" ON "candidate_claim_tokens"("candidate_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_candidate_id_key" ON "candidate_profiles"("candidate_id");

-- CreateIndex
CREATE INDEX "candidate_educations_candidate_profile_id_idx" ON "candidate_educations"("candidate_profile_id");

-- CreateIndex
CREATE INDEX "candidate_experiences_candidate_profile_id_idx" ON "candidate_experiences"("candidate_profile_id");

-- CreateIndex
CREATE INDEX "candidate_skills_candidate_profile_id_idx" ON "candidate_skills"("candidate_profile_id");

-- CreateIndex
CREATE INDEX "candidate_languages_candidate_profile_id_idx" ON "candidate_languages"("candidate_profile_id");

-- CreateIndex
CREATE INDEX "candidate_certifications_candidate_profile_id_idx" ON "candidate_certifications"("candidate_profile_id");

-- CreateIndex
CREATE INDEX "candidate_documents_candidate_profile_id_idx" ON "candidate_documents"("candidate_profile_id");

-- CreateIndex
CREATE INDEX "candidate_passports_candidate_profile_id_idx" ON "candidate_passports"("candidate_profile_id");

-- CreateIndex
CREATE INDEX "candidate_test_scores_candidate_profile_id_idx" ON "candidate_test_scores"("candidate_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "industries_slug_key" ON "industries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "job_functions_slug_key" ON "job_functions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "job_categories_slug_key" ON "job_categories"("slug");

-- CreateIndex
CREATE INDEX "job_categories_industry_id_job_function_id_idx" ON "job_categories"("industry_id", "job_function_id");

-- CreateIndex
CREATE INDEX "taxonomy_translations_entity_type_locale_idx" ON "taxonomy_translations"("entity_type", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "taxonomy_translations_entity_type_entity_id_locale_key" ON "taxonomy_translations"("entity_type", "entity_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "job_tags_catalog_slug_key" ON "job_tags_catalog"("slug");

-- CreateIndex
CREATE INDEX "job_tags_tag_id_idx" ON "job_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_tags_job_id_tag_id_key" ON "job_tags"("job_id", "tag_id");

-- CreateIndex
CREATE INDEX "idx_jobs_created_at" ON "jobs"("created_at");

-- CreateIndex
CREATE INDEX "idx_jobs_city_province" ON "jobs"("city", "province");

-- CreateIndex
CREATE INDEX "idx_jobs_visa_sponsorship" ON "jobs"("visa_sponsorship");

-- CreateIndex
CREATE INDEX "idx_jobs_foreigner_eligible" ON "jobs"("foreigner_eligible");

-- CreateIndex
CREATE INDEX "idx_jobs_remote_policy" ON "jobs"("remote_policy");

-- CreateIndex
CREATE INDEX "idx_jobs_category_id" ON "jobs"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_translations_job_id_language_code_key" ON "job_translations"("job_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "job_language_requirements_job_id_language_key" ON "job_language_requirements"("job_id", "language");

-- CreateIndex
CREATE INDEX "job_allowed_nationalities_nationality_code_idx" ON "job_allowed_nationalities"("nationality_code");

-- CreateIndex
CREATE UNIQUE INDEX "job_allowed_nationalities_job_id_nationality_code_key" ON "job_allowed_nationalities"("job_id", "nationality_code");

-- CreateIndex
CREATE INDEX "job_locations_country_province_city_idx" ON "job_locations"("country", "province", "city");

-- CreateIndex
CREATE INDEX "idx_applications_job_created_at" ON "applications"("job_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_applications_candidate_created_at" ON "applications"("candidate_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_applications_status" ON "applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_job_id_candidate_id_key" ON "applications"("job_id", "candidate_id");

-- CreateIndex
CREATE INDEX "applications_archive_job_id_created_at_idx" ON "applications_archive"("job_id", "created_at");

-- CreateIndex
CREATE INDEX "applications_archive_candidate_id_created_at_idx" ON "applications_archive"("candidate_id", "created_at");

-- CreateIndex
CREATE INDEX "applications_archive_status_idx" ON "applications_archive"("status");

-- CreateIndex
CREATE INDEX "application_events_application_id_created_at_idx" ON "application_events"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "application_notes_application_id_created_at_idx" ON "application_notes"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "conversations_candidate_id_company_id_idx" ON "conversations"("candidate_id", "company_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_sent_at_idx" ON "messages"("conversation_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blog_post_translations_blog_post_id_language_code_key" ON "blog_post_translations"("blog_post_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "tutorials_slug_key" ON "tutorials"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tutorial_translations_tutorial_id_language_code_key" ON "tutorial_translations"("tutorial_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_object_key_key" ON "media_assets"("object_key");

-- CreateIndex
CREATE INDEX "media_assets_owner_user_id_idx" ON "media_assets"("owner_user_id");

-- CreateIndex
CREATE INDEX "media_assets_company_id_idx" ON "media_assets"("company_id");

-- CreateIndex
CREATE INDEX "idx_tracking_events_created_at" ON "tracking_events"("created_at");

-- CreateIndex
CREATE INDEX "idx_tracking_events_event_name_created_at" ON "tracking_events"("event_name", "created_at");

-- CreateIndex
CREATE INDEX "idx_tracking_events_utm_source_created_at" ON "tracking_events"("utm_source", "created_at");

-- CreateIndex
CREATE INDEX "tracking_events_archive_created_at_event_name_idx" ON "tracking_events_archive"("created_at", "event_name");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_daily_aggregates_metric_date_metric_key_key" ON "analytics_daily_aggregates"("metric_date", "metric_key");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_translations_plan_id_language_code_key" ON "subscription_plan_translations"("plan_id", "language_code");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_company_id_status_idx" ON "subscriptions"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_code_key" ON "entitlements"("code");

-- CreateIndex
CREATE UNIQUE INDEX "plan_entitlements_subscription_plan_id_entitlement_id_key" ON "plan_entitlements"("subscription_plan_id", "entitlement_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_entitlements_subscription_id_entitlement_id_key" ON "subscription_entitlements"("subscription_id", "entitlement_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_customers_provider_provider_customer_id_key" ON "payment_customers"("provider", "provider_customer_id");

-- AddForeignKey
ALTER TABLE "user_ai_key_credentials" ADD CONSTRAINT "user_ai_key_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_verification_documents" ADD CONSTRAINT "company_verification_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_verification_documents" ADD CONSTRAINT "company_verification_documents_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_claim_tokens" ADD CONSTRAINT "candidate_claim_tokens_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_educations" ADD CONSTRAINT "candidate_educations_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_experiences" ADD CONSTRAINT "candidate_experiences_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_languages" ADD CONSTRAINT "candidate_languages_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_certifications" ADD CONSTRAINT "candidate_certifications_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_passports" ADD CONSTRAINT "candidate_passports_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_test_scores" ADD CONSTRAINT "candidate_test_scores_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_categories" ADD CONSTRAINT "job_categories_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_categories" ADD CONSTRAINT "job_categories_job_function_id_fkey" FOREIGN KEY ("job_function_id") REFERENCES "job_functions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_tags" ADD CONSTRAINT "job_tags_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_tags" ADD CONSTRAINT "job_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "job_tags_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "job_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_translations" ADD CONSTRAINT "job_translations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_language_requirements" ADD CONSTRAINT "job_language_requirements_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_allowed_nationalities" ADD CONSTRAINT "job_allowed_nationalities_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_locations" ADD CONSTRAINT "job_locations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications_archive" ADD CONSTRAINT "applications_archive_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications_archive" ADD CONSTRAINT "applications_archive_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_translations" ADD CONSTRAINT "blog_post_translations_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_translations" ADD CONSTRAINT "blog_post_translations_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorial_translations" ADD CONSTRAINT "tutorial_translations_tutorial_id_fkey" FOREIGN KEY ("tutorial_id") REFERENCES "tutorials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorial_translations" ADD CONSTRAINT "tutorial_translations_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events_archive" ADD CONSTRAINT "tracking_events_archive_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_translations" ADD CONSTRAINT "subscription_plan_translations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_entitlements" ADD CONSTRAINT "plan_entitlements_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_entitlements" ADD CONSTRAINT "plan_entitlements_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "entitlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_entitlements" ADD CONSTRAINT "subscription_entitlements_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_entitlements" ADD CONSTRAINT "subscription_entitlements_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "entitlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_customers" ADD CONSTRAINT "payment_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_customers" ADD CONSTRAINT "payment_customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;



