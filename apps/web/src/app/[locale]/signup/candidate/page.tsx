import type { Metadata } from "next";
import PersonAddAltRounded from "@mui/icons-material/PersonAddAltRounded";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { CandidateSignupForm } from "@/components/auth/CandidateSignupForm";
import { getDictionary, isSupportedLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Candidate Signup" };
}

export default async function CandidateSignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  const dictionary = getDictionary(locale);

  return (
    <Container sx={{ py: { xs: 3, md: 6 } }}>
      <Card sx={{ maxWidth: 920, mx: "auto", overflow: "hidden" }}>
        <Stack direction={{ xs: "column", md: "row" }}>
          <Stack
            spacing={2}
            sx={{
              flex: 1,
              p: { xs: 3, md: 4 },
              background: "linear-gradient(145deg, rgba(17,205,222,0.14), rgba(253,124,111,0.16))",
            }}
          >
            <PersonAddAltRounded color="primary" />
            <Typography variant="h2">{dictionary["nav.signupCandidate"]}</Typography>
            <Typography color="text.secondary">
              Start with a clean account. The detailed candidate profile, documents, language scores, and China history are completed after signup.
            </Typography>
          </Stack>
          <CardContent sx={{ flex: 1, p: { xs: 3, md: 4 } }}>
            <CandidateSignupForm locale={locale} />
          </CardContent>
        </Stack>
      </Card>
    </Container>
  );
}
