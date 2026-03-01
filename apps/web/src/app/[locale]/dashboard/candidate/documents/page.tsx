import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { CandidateDocumentsManager } from "@/components/candidate/CandidateDocumentsManager";
import { isSupportedLocale } from "@/lib/i18n";

export default async function CandidateDocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  return (
    <Stack spacing={2}>
      <Typography variant="h2">Document center</Typography>
      <Typography color="text.secondary">Upload, preview, and remove private candidate files.</Typography>
      <CandidateDocumentsManager />
    </Stack>
  );
}
