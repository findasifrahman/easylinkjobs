import type { Metadata } from "next";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { JobCard } from "@/components/home/JobCard";
import { isSupportedLocale } from "@/lib/i18n";
import { fetchPublicJobs } from "@/lib/server-api";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; city: string }> }): Promise<Metadata> {
  const { locale, city } = await params;
  return {
    title: `Jobs in ${city}`,
    alternates: {
      canonical: `/${locale}/jobs/in/${city}`,
      languages: {
        en: `/en/jobs/in/${city}`,
        zh: `/zh/jobs/in/${city}`,
        bn: `/bn/jobs/in/${city}`
      }
    }
  };
}

export default async function JobsByCityPage({ params }: { params: Promise<{ locale: string; city: string }> }) {
  const { locale, city } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const normalizedCity = city.replace(/-/g, " ");
  const payload = await fetchPublicJobs({ city: normalizedCity }).catch(() => ({ items: [] as Array<Record<string, unknown>> }));
  const items = payload.items;

  return (
    <Container sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Typography variant="h2">Jobs in {normalizedCity}</Typography>
        <Grid container spacing={2.5}>
          {items.map((job) => (
            <Grid key={String(job.id)} size={{ xs: 12, md: 6, xl: 4 }}>
              <JobCard job={{ id: String(job.id), slug: String(job.id), title: String(job.title), company: String(((job.company as Record<string, unknown> | undefined)?.name) ?? "Verified employer"), city: String(job.city ?? normalizedCity), country: String(job.country ?? "China"), visaSponsored: Boolean(job.visaSponsorship), salary: job.salaryMin || job.salaryMax ? `${job.salaryMin ?? "?"}-${job.salaryMax ?? "?"} ${job.currency ?? "CNY"}` : "Salary on request", tag: "City landing" }} locale={locale} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}
