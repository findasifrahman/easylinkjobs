import type { Metadata } from "next";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobCard } from "@/components/home/JobCard";
import { JobsFilterBar } from "@/components/home/JobsFilterBar";
import { getDictionary, isSupportedLocale } from "@/lib/i18n";
import { fetchPublicCategories, fetchPublicJobs } from "@/lib/server-api";

const featuredJobs = [
  {
    id: "esl-teacher-shanghai-campus",
    slug: "esl-teacher-shanghai-campus",
    title: "ESL Teacher - Shanghai Campus",
    company: "Aurora Learning Group",
    city: "Shanghai",
    country: "China",
    visaSponsored: true,
    salary: "18k-26k CNY",
    tag: "Fast Visa",
  },
  {
    id: "online-ielts-tutor",
    slug: "online-ielts-tutor",
    title: "Online IELTS Tutor",
    company: "BluePeak Academy",
    city: "Hangzhou",
    country: "China",
    visaSponsored: false,
    salary: "12k-18k CNY",
    tag: "Remote",
  },
  {
    id: "shenzhen-curriculum",
    slug: "shenzhen-curriculum",
    title: "Curriculum Coordinator",
    company: "Harbor International School",
    city: "Shenzhen",
    country: "China",
    visaSponsored: true,
    salary: "24k-34k CNY",
    tag: "Leadership",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Jobs",
    description: "Browse SEO-friendly foreigner-friendly job listings."
  };
}

export default async function JobsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; city?: string; q?: string; visa_sponsorship?: string; page?: string }>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  const dictionary = getDictionary(locale);
  const selectedCategory = filters.category ?? "";
  const selectedCity = filters.city ?? "";
  const selectedQuery = filters.q ?? "";
  const selectedVisa = filters.visa_sponsorship === "true" ? true : filters.visa_sponsorship === "false" ? false : undefined;
  const currentPage = Math.max(Number(filters.page ?? "1") || 1, 1);
  const pageSize = 12;

  let jobs = featuredJobs;
  let total = jobs.length;
  const categories = await fetchPublicCategories(locale).catch(() => []);

  try {
    const apiPayload = await fetchPublicJobs({
      category: selectedCategory || undefined,
      city: selectedCity || undefined,
      q: selectedQuery || undefined,
      visaSponsorship: selectedVisa,
      page: currentPage,
      pageSize,
    });
    total = apiPayload.total;
    if (apiPayload.items.length > 0) {
        jobs = apiPayload.items.map((job) => ({
          id: String(job.id),
          slug: String(job.id),
        title: String(job.title ?? "Untitled role"),
        company: String((job.company_name as string | undefined) ?? "Verified employer"),
        city: String(job.city ?? ""),
        country: String(job.country ?? ""),
        visaSponsored: Boolean(job.visaSponsorship ?? job.visa_sponsorship),
        salary:
          job.salaryMin || job.salaryMax || job.salary_min || job.salary_max
            ? `${job.salaryMin ?? job.salary_min ?? "?"}-${job.salaryMax ?? job.salary_max ?? "?"} ${job.currency ?? "CNY"}`
            : "Salary on request",
        tag: Boolean(job.foreignerEligible ?? job.foreigner_eligible) ? "Foreigner-friendly" : "Hiring"
      }));
    } else {
      jobs = [];
    }
  } catch {
    jobs = selectedCategory || selectedCity || selectedQuery ? [] : featuredJobs.concat(featuredJobs);
    total = jobs.length;
  }

  const categoryLabel =
    categories.find((item) => String(item.slug) === selectedCategory)?.name ?? selectedCategory.replace(/-/g, " ");
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const paginationParams = new URLSearchParams();
  if (selectedCategory) paginationParams.set("category", selectedCategory);
  if (selectedCity) paginationParams.set("city", selectedCity);
  if (selectedQuery) paginationParams.set("q", selectedQuery);
  if (typeof selectedVisa === "boolean") paginationParams.set("visa_sponsorship", String(selectedVisa));

  return (
    <Container sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h2">{dictionary["nav.jobs"]}</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
            Filter by city, category, visa support, and employer trust signals. Public list pages stay SSR-first for search visibility.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {selectedCategory ? <Chip label={`Category: ${categoryLabel}`} color="primary" variant="outlined" /> : null}
            {selectedCity ? <Chip label={`City: ${selectedCity}`} variant="outlined" /> : null}
            {selectedQuery ? <Chip label={`Search: ${selectedQuery}`} variant="outlined" /> : null}
            {typeof selectedVisa === "boolean" ? <Chip label={selectedVisa ? "Visa sponsored" : "No visa"} variant="outlined" /> : null}
          </Stack>
        </Stack>
        <JobsFilterBar />
        <Stack spacing={1}>
          <Typography variant="h4">Browse by category</Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {categories.map((item) => (
              <Chip
                key={String(item.id)}
                component={Link}
                clickable
                href={`/${locale}/jobs?category=${encodeURIComponent(String(item.slug))}`}
                label={`${String(item.name)} (${Number(item.job_count ?? 0)})`}
                color={String(item.slug) === selectedCategory ? "primary" : "default"}
                variant={String(item.slug) === selectedCategory ? "filled" : "outlined"}
              />
            ))}
          </Stack>
        </Stack>
        <Grid container spacing={2.5}>
          {jobs.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Typography color="text.secondary">No jobs matched this filter yet.</Typography>
            </Grid>
          ) : (
            jobs.map((job, index) => (
              <Grid key={`${job.id}-${index}`} size={{ xs: 12, md: 6, xl: 4 }}>
                <JobCard job={job} locale={locale} />
              </Grid>
            ))
          )}
        </Grid>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography color="text.secondary">
            Page {currentPage} of {totalPages}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              component={Link}
              href={`/${locale}/jobs?${new URLSearchParams({ ...Object.fromEntries(paginationParams), page: String(Math.max(currentPage - 1, 1)) }).toString()}`}
              variant="outlined"
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              component={Link}
              href={`/${locale}/jobs?${new URLSearchParams({ ...Object.fromEntries(paginationParams), page: String(Math.min(currentPage + 1, totalPages)) }).toString()}`}
              variant="outlined"
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Container>
  );
}
