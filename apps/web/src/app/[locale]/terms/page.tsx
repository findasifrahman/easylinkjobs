import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { getDictionary, isSupportedLocale } from "@/lib/i18n";

export default async function TermsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  const dictionary = getDictionary(locale);
  return (
    <Container sx={{ py: { xs: 2.5, md: 4 } }}>
      <Stack spacing={1.5}>
        <Typography variant="h2">{dictionary["terms.title"]}</Typography>
        <Typography color="text.secondary">
          {dictionary["terms.body"]}
        </Typography>
      </Stack>
    </Container>
  );
}
