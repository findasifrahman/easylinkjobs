import type { Metadata } from "next";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import ShieldRounded from "@mui/icons-material/ShieldRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import Box from "@mui/material/Box";
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

import { JobCard } from "@/components/home/JobCard";
import { JobCarousel } from "@/components/home/JobCarousel";
import { NoticeTicker } from "@/components/home/NoticeTicker";
import { getDictionary, isSupportedLocale } from "@/lib/i18n";
import { fetchPublicCategories, fetchPublicJobs } from "@/lib/server-api";
import { themeTokens } from "@/theme";

const noticeItems = [
  "Visa policy watch: Shanghai schools are reopening spring hiring.",
  "112 new verified jobs added in the last 48 hours.",
  "Work permit processing times improved for teaching roles in Zhejiang.",
];

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

const heroMetrics = [
  { label: "Verified employers", value: "420+" },
  { label: "Fresh roles this week", value: "1.8k" },
  { label: "Avg. first response", value: "36h" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Home",
    description: `Foreigner-friendly job search and hiring platform for ${locale.toUpperCase()}.`,
  };
}

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);
  const scrapedJobsPayload = await fetchPublicJobs({ source: "SCRAPED", pageSize: 6 }).catch(() => ({
    items: [] as Array<Record<string, unknown>>,
  }));
  const latestPublicJobsPayload = await fetchPublicJobs({ pageSize: 6 }).catch(() => ({
    items: [] as Array<Record<string, unknown>>,
  }));
  const scrapedJobs = scrapedJobsPayload.items;
  const latestPublicJobs = latestPublicJobsPayload.items;
  const apiCategories = await fetchPublicCategories(locale).catch(() => []);
  const categories = apiCategories
    .map((item) => ({
      id: String(item.id ?? ""),
      title: String(item.name ?? "Category"),
      slug: String(item.slug ?? "category"),
      count: Number(item.job_count ?? 0),
    }))
    .filter((item) => item.id);
  const liveJobs = latestPublicJobs.slice(0, 6).map((job) => ({
    id: String(job.id ?? ""),
    slug: String(job.id ?? ""),
    title: String(job.title ?? "Open role"),
    company: String(job.company_name ?? "Employer listed"),
    city: String(job.city ?? ""),
    country: String(job.country ?? "China"),
    visaSponsored: Boolean(job.visaSponsorship),
    salary:
      job.salaryMin || job.salaryMax
        ? `${job.salaryMin ?? "?"}-${job.salaryMax ?? "?"} ${job.currency ?? "CNY"}`
        : "Salary on request",
    tag: "Live",
  }));

  const freshCollected = scrapedJobs.slice(0, 3).map((job) => ({
    id: String(job.id),
    slug: String(job.id),
    title: String(job.title ?? "Collected job"),
    company: String(((job.company as Record<string, unknown> | undefined)?.name) ?? "Collected source"),
    city: String(job.city ?? ""),
    country: String(job.country ?? "China"),
    visaSponsored: Boolean(job.visaSponsorship),
    salary:
      job.salaryMin || job.salaryMax
        ? `${job.salaryMin ?? "?"}-${job.salaryMax ?? "?"} ${job.currency ?? "CNY"}`
        : "Salary on request",
    tag: "Collected",
  }));

  return (
    <Container sx={{ py: { xs: 2, md: 3 } }}>
      <Stack spacing={{ xs: themeTokens.layout.sectionGap.mobile, md: themeTokens.layout.sectionGap.desktop }}>
        <NoticeTicker label={dictionary["sections.notice"]} items={noticeItems} />

        <Grid container spacing={{ xs: 3, md: 4 }} alignItems="stretch">
          <Grid size={{ xs: 12, lg: 7.2 }}>
            <Card
              sx={{
                minHeight: "100%",
                overflow: "hidden",
                position: "relative",
                bgcolor: "background.paper",
                background:
                  "linear-gradient(160deg, rgba(17,205,222,0.12) 0%, rgba(255,255,255,0.98) 40%, rgba(253,124,111,0.14) 100%)",
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
                <Stack spacing={2.5}>
                  <Chip
                    icon={<AutoAwesomeRounded />}
                    label="Verified companies • Visa signals • Smart tracking"
                    color="secondary"
                    sx={{ alignSelf: "flex-start" }}
                  />
                  <Typography variant="h1" sx={{ maxWidth: 760 }}>
                    {dictionary["hero.title"]}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ maxWidth: 600, fontSize: { xs: "0.94rem", md: "0.98rem" } }}
                  >
                    {dictionary["hero.subtitle"]}
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button
                      component={Link}
                      href={`/${locale}/jobs`}
                      variant="contained"
                      size="large"
                      startIcon={<SearchRounded />}
                    >
                      {dictionary["hero.ctaPrimary"]}
                    </Button>
                    <Button component={Link} href={`/${locale}/signup`} variant="outlined" size="large">
                      {dictionary["hero.ctaSecondary"]}
                    </Button>
                  </Stack>
                  <Grid container spacing={1.75}>
                    {heroMetrics.map((metric) => (
                      <Grid key={metric.label} size={{ xs: 12, sm: 4 }}>
                        <Card sx={{ bgcolor: "rgba(255,255,255,0.86)" }}>
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="h3" sx={{ fontWeight: 780 }}>
                              {metric.value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {metric.label}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4.8 }}>
            <Stack spacing={3} sx={{ height: "100%" }}>
              <Card sx={{ bgcolor: "background.paper", flex: 1 }}>
                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <ShieldRounded color="primary" />
                      <Typography variant="h4">Built for clarity</Typography>
                    </Stack>
                    <Typography color="text.secondary">
                      Structured job cards, employer verification, multilingual public pages, and privacy-aware tracking.
                    </Typography>
                    <Stack spacing={1.5}>
                      {[
                        "Know visa sponsorship before you click.",
                        "See which employers are verified.",
                        "Keep applications and recruiter notes in one flow.",
                      ].map((line) => (
                        <Stack key={line} direction="row" spacing={1.25} alignItems="center">
                          <TrendingUpRounded fontSize="small" color="secondary" />
                          <Typography variant="body2">{line}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
              <Card
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.9)",
                  color: "primary.inverted",
                  borderColor: "rgba(17,205,222,0.28)",
                }}
              >
                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Typography variant="h4" sx={{ mb: 1.5 }}>
                    Search-ready and recruiter-ready.
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.88 }}>
                    SSR public pages, route-based i18n, and tracked actions from search to apply.
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>

        <JobCarousel jobs={liveJobs.length > 0 ? liveJobs : featuredJobs} locale={locale} />

        <Box>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="h2">Fresh foreigner-friendly jobs today</Typography>
              <Chip label="Collected" color="secondary" />
            </Stack>
            <Typography color="text.secondary">Daily pushed from Clawbot-secured ingestion.</Typography>
          </Stack>
          <Grid container spacing={2.5}>
            {(freshCollected.length > 0 ? freshCollected : (liveJobs.length > 0 ? liveJobs.slice(0, 3) : featuredJobs.slice(0, 3))).map((job) => (
              <Grid key={job.id} size={{ xs: 12, md: 6, xl: 4 }}>
                <JobCard job={job} locale={locale} />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box>
          <Stack spacing={2} sx={{ mb: 1 }}>
            <Typography variant="h2">{dictionary["sections.categories"]}</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
              Browse live categories with current open-job counts. Counts exclude expired postings automatically.
            </Typography>
          </Stack>
          <Card
            sx={{
              bgcolor: "rgba(255,255,255,0.94)",
              borderColor: "rgba(17,205,222,0.12)",
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              {categories.length > 0 ? (
                <Grid container spacing={{ xs: 1.5, md: 1 }}>
                  {categories.map((category) => (
                    <Grid key={category.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Button
                        component={Link}
                        href={`/${locale}/jobs?category=${encodeURIComponent(category.slug)}`}
                        variant="text"
                        fullWidth
                        sx={{
                          justifyContent: "flex-start",
                          px: 0,
                          py: 0.45,
                          minHeight: 0,
                          color: "text.primary",
                          fontWeight: 500,
                          textTransform: "none",
                          borderRadius: 0,
                          "&:hover": {
                            bgcolor: "transparent",
                            color: "primary.main",
                          },
                        }}
                        startIcon={<ChevronRightRounded sx={{ color: "secondary.main" }} />}
                      >
                        {category.title} ({category.count})
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary">No categories have been added yet.</Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
            <Typography variant="h2">{dictionary["sections.latestJobs"]}</Typography>
            <Button component={Link} href={`/${locale}/jobs`} variant="text">
              Browse all jobs
            </Button>
          </Stack>
          <Grid container spacing={2.5}>
            {(liveJobs.length > 0 ? liveJobs : featuredJobs).map((job) => (
              <Grid key={job.id} size={{ xs: 12, md: 6, xl: 4 }}>
                <JobCard job={job} locale={locale} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Stack>
    </Container>
  );
}
