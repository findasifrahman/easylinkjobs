import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { CandidateProfileWizard } from "@/components/candidate/CandidateProfileWizard";
import { CandidateProfileManager } from "@/components/candidate/CandidateProfileManager";
import { isSupportedLocale } from "@/lib/i18n";

export default async function CandidateProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  return (
    <Stack spacing={2}>
      <Typography variant="h2">Profile management</Typography>
      <Typography color="text.secondary">
        Use the guided stepper for a structured update, then manage each section directly below.
      </Typography>
      <CandidateProfileWizard mode="manage" />
      <CandidateProfileManager />
    </Stack>
  );
}
