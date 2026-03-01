import AccountCircleRounded from "@mui/icons-material/AccountCircleRounded";
import SecurityRounded from "@mui/icons-material/SecurityRounded";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { CandidateSettingsPanel } from "@/components/candidate/CandidateSettingsPanel";
import { getDictionary, isSupportedLocale } from "@/lib/i18n";

export default async function ProfileSettingsPage({
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
      <Stack spacing={2.5}>
        <Typography variant="h2">{dictionary["settings.title"]}</Typography>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AccountCircleRounded color="primary" fontSize="small" />
                <Typography variant="h5">{dictionary["settings.preferencesTitle"]}</Typography>
              </Stack>
              <Typography color="text.secondary">
                {dictionary["settings.preferencesBody"]}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} alignItems="center">
                <SecurityRounded color="primary" fontSize="small" />
                <Typography variant="h5">{dictionary["settings.securityTitle"]}</Typography>
              </Stack>
              <Typography color="text.secondary">
                {dictionary["settings.securityBody"]}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
        <CandidateSettingsPanel />
      </Stack>
    </Container>
  );
}
