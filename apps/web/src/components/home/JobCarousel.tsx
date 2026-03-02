"use client";

import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import VerifiedRounded from "@mui/icons-material/VerifiedRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useMemo, useState } from "react";

import { trackEvent } from "@/components/tracking/TrackingProvider";

type JobSummary = {
  id: string;
  slug: string;
  title: string;
  company: string;
  city: string;
  country: string;
  visaSponsored: boolean;
  salary: string;
  tag: string;
};

type Props = {
  jobs: JobSummary[];
  locale: string;
};

export function JobCarousel({ jobs, locale }: Props) {
  const [index, setIndex] = useState(0);
  const active = useMemo(() => jobs[index % jobs.length], [index, jobs]);

  return (
    <Card
      sx={{
        p: { xs: 1, md: 2 },
        background:
          "linear-gradient(135deg, rgba(17,205,222,0.12) 0%, rgba(255,255,255,0.98) 50%, rgba(253,124,111,0.12) 100%)"
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: "0.12em" }}>
                Spotlight role
              </Typography>
              <Typography variant="h3" sx={{ maxWidth: 620 }}>
                {active.title}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {jobs.map((job, itemIndex) => (
                <Chip
                  key={job.id}
                  label={job.city}
                  color={itemIndex === index ? "primary" : "default"}
                  onClick={() => setIndex(itemIndex)}
                  sx={{ cursor: "pointer" }}
                />
              ))}
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <VerifiedRounded color="primary" fontSize="small" />
                <Typography variant="body1" fontWeight={700}>
                  {active.company}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {active.city}, {active.country} • {active.salary}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={active.tag} color="secondary" />
                <Chip label={active.visaSponsored ? "Visa supported" : "No visa"} variant="outlined" />
              </Stack>
            </Stack>
            <Stack spacing={1.5} alignItems={{ xs: "flex-start", md: "flex-end" }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTimeRounded fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Updated 2 hours ago
                </Typography>
              </Stack>
              <Button
                component={Link}
                href={`/${locale}/jobs/${active.slug}`}
                variant="contained"
                endIcon={<ArrowForwardRounded />}
                onClick={() => {
                  void trackEvent("view_job", { jobId: active.id, source: "homepage_carousel" });
                }}
              >
                View job
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
