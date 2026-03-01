import type { Metadata } from "next";
import type { ReactNode } from "react";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import PlaceRounded from "@mui/icons-material/PlaceRounded";
import ShieldRounded from "@mui/icons-material/ShieldRounded";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobApplyPanel } from "@/components/jobs/JobApplyPanel";
import { featuredJobs } from "@/lib/data/content";
import { isSupportedLocale } from "@/lib/i18n";
import { fetchPublicJob } from "@/lib/server-api";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; "id-or-slug": string }>;
}): Promise<Metadata> {
  const resolved = await params;
  const jobKey = resolved["id-or-slug"];
  return {
    title: `Job | ${jobKey}`,
    description: `Job detail page for ${jobKey}.`,
    alternates: {
      canonical: `/${resolved.locale}/jobs/${jobKey}`
    }
  };
}

export default async function JobDetailPage({
  params
}: {
  params: Promise<{ locale: string; "id-or-slug": string }>;
}) {
  const resolved = await params;
  if (!isSupportedLocale(resolved.locale)) {
    notFound();
  }

  const fallback = featuredJobs.find((item) => item.slug === resolved["id-or-slug"]) ?? featuredJobs[0];
  let job = {
    id: fallback.id,
    title: fallback.title,
    company: { name: fallback.company, slug: "verified-company" },
    city: fallback.city,
    province: null as string | null,
    country: fallback.country,
    visaSponsorship: fallback.visaSponsored,
    foreignerEligible: true,
    workPermitSupport: true,
    englishRequired: true,
    relocationSupport: false,
    housingProvided: false,
    salaryMin: null as number | null,
    salaryMax: null as number | null,
    currency: "CNY",
    description:
      "This SSR detail page keeps public job content indexable while surfacing eligibility, salary, and recruiter expectations above the fold."
  };

  try {
    const apiJob = await fetchPublicJob(resolved["id-or-slug"]);
    const apiCompany = apiJob.company as { name?: string; slug?: string } | undefined;
    job = {
      id: String(apiJob.id),
      title: String(apiJob.title ?? fallback.title),
      company: {
        name: apiCompany?.name ?? fallback.company,
        slug: apiCompany?.slug ?? "verified-company"
      },
      city: String(apiJob.city ?? fallback.city),
      province: typeof apiJob.province === "string" ? apiJob.province : null,
      country: String(apiJob.country ?? fallback.country),
      visaSponsorship: Boolean(apiJob.visaSponsorship),
      foreignerEligible: Boolean(apiJob.foreignerEligible),
      workPermitSupport: Boolean(apiJob.workPermitSupport),
      englishRequired: Boolean(apiJob.englishRequired),
      relocationSupport: Boolean(apiJob.relocationSupport),
      housingProvided: Boolean(apiJob.housingProvided),
      salaryMin: typeof apiJob.salaryMin === "number" ? apiJob.salaryMin : null,
      salaryMax: typeof apiJob.salaryMax === "number" ? apiJob.salaryMax : null,
      currency: typeof apiJob.currency === "string" ? apiJob.currency : "CNY",
      description: String(apiJob.description ?? job.description)
    };
  } catch {
    // Keep fallback content when the API is unavailable.
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: new Date().toISOString(),
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: job.company.name
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.city,
        addressRegion: job.province,
        addressCountry: job.country
      }
    },
    baseSalary:
      job.salaryMin || job.salaryMax
        ? {
            "@type": "MonetaryAmount",
            currency: job.currency,
            value: {
              "@type": "QuantitativeValue",
              minValue: job.salaryMin,
              maxValue: job.salaryMax
            }
          }
        : undefined
  };

  return (
    <Container sx={{ py: { xs: 3, md: 5 } }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Card>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={2.5}>
                  <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
                    <BoxStack title={job.title} company={job.company.name} />
                    <Chip label={job.visaSponsorship ? "Visa sponsorship" : "Employer listed"} color="primary" />
                  </Stack>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <MetaItem icon={<PlaceRounded fontSize="small" />} label={[job.city, job.province, job.country].filter(Boolean).join(", ")} />
                    <MetaItem
                      icon={<ApartmentRounded fontSize="small" />}
                      label={
                        job.salaryMin || job.salaryMax
                          ? `${job.salaryMin ?? "?"}-${job.salaryMax ?? "?"} ${job.currency}`
                          : "Salary on request"
                      }
                    />
                    <MetaItem icon={<ShieldRounded fontSize="small" />} label="Verified employer" />
                  </Stack>
                  <Typography color="text.secondary">{job.description}</Typography>
                </Stack>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={2}>
                  <Typography variant="h4">Role snapshot</Typography>
                  {[
                    job.foreignerEligible ? "Foreigner eligible" : "Foreigner eligibility restricted",
                    job.housingProvided ? "Housing support available" : "Housing not included",
                    job.englishRequired ? "English required" : "English optional",
                    job.workPermitSupport ? "Work permit support included" : "Work permit support not listed",
                    job.relocationSupport ? "Relocation support available" : "Relocation handled by candidate"
                  ].map((item) => (
                    <Stack key={item} direction="row" spacing={1.25} alignItems="center">
                      <CheckCircleRounded color="primary" fontSize="small" />
                      <Typography variant="body2">{item}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2.5}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <JobApplyPanel jobId={job.id} locale={resolved.locale} />
                <Stack sx={{ mt: 2 }}>
                  <Button
                    component={Link}
                    href={`/${resolved.locale}/companies/${job.company.slug ?? "verified-company"}`}
                    variant="outlined"
                  >
                    View company
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}

function MetaItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {icon}
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}

function BoxStack({ title, company }: { title: string; company: string }) {
  return (
    <Stack spacing={1}>
      <Typography variant="h2">{title}</Typography>
      <Typography variant="body1" color="text.secondary">
        {company}
      </Typography>
    </Stack>
  );
}
