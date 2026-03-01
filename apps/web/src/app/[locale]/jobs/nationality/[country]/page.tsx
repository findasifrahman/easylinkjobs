import type { Metadata } from "next";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { JobCard } from "@/components/home/JobCard";
import { isSupportedLocale } from "@/lib/i18n";
import { fetchPublicJobs } from "@/lib/server-api";

const nationalityCode: Record<string, string> = {
  bangladesh: "BD",
  india: "IN",
  pakistan: "PK",
  nigeria: "NG",
  nepal: "NP"
};

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; country: string }>;
}): Promise<Metadata> {
  const { locale, country } = await params;
  return {
    title: `Jobs for ${country}`,
    alternates: {
      canonical: `/${locale}/jobs/nationality/${country}`,
      languages: {
        en: `/en/jobs/nationality/${country}`,
        zh: `/zh/jobs/nationality/${country}`,
        bn: `/bn/jobs/nationality/${country}`
      }
    }
  };
}

export default async function JobsByNationalityPage({
  params
}: {
  params: Promise<{ locale: string; country: string }>;
}) {
  const { locale, country } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const code = nationalityCode[country] ?? country.toUpperCase();
  const payload = await fetchPublicJobs({ nationality: code }).catch(() => ({ items: [] as Array<Record<string, unknown>> }));
  const items = payload.items;

  return (
    <Container sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Typography variant="h2">Jobs for {country}</Typography>
        <Grid container spacing={2.5}>
          {items.map((job) => (
            <Grid key={String(job.id)} size={{ xs: 12, md: 6, xl: 4 }}>
              <JobCard job={{ id: String(job.id), slug: String(job.id), title: String(job.title), company: String(((job.company as Record<string, unknown> | undefined)?.name) ?? "Verified employer"), city: String(job.city ?? ""), country: String(job.country ?? "China"), visaSponsored: Boolean(job.visaSponsorship), salary: job.salaryMin || job.salaryMax ? `${job.salaryMin ?? "?"}-${job.salaryMax ?? "?"} ${job.currency ?? "CNY"}` : "Salary on request", tag: "Nationality landing" }} locale={locale} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}
