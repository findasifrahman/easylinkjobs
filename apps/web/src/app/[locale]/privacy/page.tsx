import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { getDictionary, isSupportedLocale } from "@/lib/i18n";

export default async function PrivacyPage({
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
        <Typography variant="h2">{dictionary["privacy.title"]}</Typography>
        <Typography color="text.secondary">
          {dictionary["privacy.body"]}
        </Typography>
        <Typography color="text.secondary">
          Cookie consent controls analytics and marketing separately. Until analytics consent is granted, the web app does not create `anonymous_id`, does not create `session_id`, and does not send tracking events.
        </Typography>
      </Stack>
    </Container>
  );
}
