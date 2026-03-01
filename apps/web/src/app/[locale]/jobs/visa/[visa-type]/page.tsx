import type { Metadata } from "next";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { JobCard } from "@/components/home/JobCard";
import { isSupportedLocale } from "@/lib/i18n";
import { fetchPublicJobs } from "@/lib/server-api";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; "visa-type": string }>;
}): Promise<Metadata> {
  const { locale, "visa-type": visaType } = await params;
  return {
    title: `Jobs by visa: ${visaType}`,
    alternates: {
      canonical: `/${locale}/jobs/visa/${visaType}`,
      languages: {
        en: `/en/jobs/visa/${visaType}`,
        zh: `/zh/jobs/visa/${visaType}`,
        bn: `/bn/jobs/visa/${visaType}`
      }
    }
  };
}

export default async function JobsByVisaPage({
  params
}: {
  params: Promise<{ locale: string; "visa-type": string }>;
}) {
  const { locale, "visa-type": visaType } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const payload = await fetchPublicJobs({ visaType }).catch(() => ({ items: [] as Array<Record<string, unknown>> }));
  const items = payload.items;

  return (
    <Container sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Typography variant="h2">Visa-filtered jobs: {visaType}</Typography>
        <Grid container spacing={2.5}>
          {items.map((job) => (
            <Grid key={String(job.id)} size={{ xs: 12, md: 6, xl: 4 }}>
              <JobCard job={{ id: String(job.id), slug: String(job.id), title: String(job.title), company: String(((job.company as Record<string, unknown> | undefined)?.name) ?? "Verified employer"), city: String(job.city ?? ""), country: String(job.country ?? "China"), visaSponsored: Boolean(job.visaSponsorship), salary: job.salaryMin || job.salaryMax ? `${job.salaryMin ?? "?"}-${job.salaryMax ?? "?"} ${job.currency ?? "CNY"}` : "Salary on request", tag: "Visa landing" }} locale={locale} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}
