ALTER TABLE "candidate_educations"
ADD COLUMN "degree_type" TEXT,
ADD COLUMN "is_ongoing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "passing_year" INTEGER,
ADD COLUMN "cgpa" TEXT,
ADD COLUMN "country" TEXT;
