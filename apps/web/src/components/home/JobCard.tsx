import ArrowOutwardRounded from "@mui/icons-material/ArrowOutwardRounded";
import LocationOnRounded from "@mui/icons-material/LocationOnRounded";
import WorkspacePremiumRounded from "@mui/icons-material/WorkspacePremiumRounded";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import type { JobSummary } from "@/lib/data/content";
import { themeTokens } from "@/theme";

type Props = {
  job: JobSummary;
  locale: string;
};

export function JobCard({ job, locale }: Props) {
  return (
    <Card
      component={Link}
      href={`/${locale}/jobs/${job.slug}`}
      sx={{
        display: "block",
        transition: "transform 180ms ease, box-shadow 180ms ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: themeTokens.shadows[2]
        }
      }}
    >
      <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
        <Stack spacing={1.75}>
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Stack spacing={0.75}>
              <Typography variant="h5">{job.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {job.company}
              </Typography>
            </Stack>
            <ArrowOutwardRounded color="primary" />
          </Stack>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <LocationOnRounded fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {job.city}, {job.country}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} flexWrap="wrap">
            <Chip size="small" label={job.salary} />
            <Chip
              size="small"
              icon={<WorkspacePremiumRounded />}
              color={job.visaSponsored ? "primary" : "default"}
              label={job.visaSponsored ? "Visa ready" : "Employer listed"}
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
