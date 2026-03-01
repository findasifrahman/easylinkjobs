import type { Metadata } from "next";
import LockOpenRounded from "@mui/icons-material/LockOpenRounded";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LoginForm } from "@/components/candidate/LoginForm";
import { getDictionary, isSupportedLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Login" };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  const dictionary = getDictionary(locale);
  return (
    <Container sx={{ py: { xs: 3, md: 7 } }}>
      <Card sx={{ maxWidth: 980, mx: "auto", overflow: "hidden" }}>
        <Stack direction={{ xs: "column", md: "row" }}>
          <Stack
            sx={{
              flex: 1,
              p: { xs: 3, md: 5 },
              background: "linear-gradient(145deg, rgba(17,205,222,0.16), rgba(253,124,111,0.18))"
            }}
            spacing={2}
          >
            <LockOpenRounded color="primary" />
            <Typography variant="h2">{dictionary["auth.loginTitle"]}</Typography>
            <Typography color="text.secondary">
              Continue where you left off: saved searches, applications, recruiter replies, and dashboard analytics.
            </Typography>
          </Stack>
          <CardContent sx={{ flex: 1, p: { xs: 3, md: 5 } }}>
            <Stack spacing={2.5}>
              <LoginForm locale={locale} />
              <Typography variant="body2" color="text.secondary">
                New here? <Link href={`/${locale}/signup`}>Create an account</Link>
              </Typography>
            </Stack>
          </CardContent>
        </Stack>
      </Card>
    </Container>
  );
}
