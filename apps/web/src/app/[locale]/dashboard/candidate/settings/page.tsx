import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { CandidateSettingsPanel } from "@/components/candidate/CandidateSettingsPanel";
import { isSupportedLocale } from "@/lib/i18n";

export default async function CandidateDashboardSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  return (
    <Stack spacing={2}>
      <Typography variant="h2">Candidate settings</Typography>
      <Typography color="text.secondary">Manage password and stored AI key access.</Typography>
      <CandidateSettingsPanel />
    </Stack>
  );
}
