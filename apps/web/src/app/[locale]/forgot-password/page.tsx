import type { Metadata } from "next";
import LockResetRounded from "@mui/icons-material/LockResetRounded";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getDictionary, isSupportedLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Forgot Password" };
}

export default async function ForgotPasswordPage({
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
    <Container sx={{ py: { xs: 3, md: 7 } }}>
      <Card sx={{ maxWidth: 860, mx: "auto", overflow: "hidden" }}>
        <Stack direction={{ xs: "column", md: "row" }}>
          <Stack
            sx={{
              flex: 1,
              p: { xs: 3, md: 5 },
              background: "linear-gradient(145deg, rgba(17,205,222,0.14), rgba(253,124,111,0.16))",
            }}
            spacing={2}
          >
            <LockResetRounded color="primary" />
            <Typography variant="h2">Reset access</Typography>
            <Typography color="text.secondary">
              Enter the email you use for {dictionary["brand"]}. The API will generate a reset link and log it until SMTP is wired.
            </Typography>
          </Stack>
          <CardContent sx={{ flex: 1, p: { xs: 3, md: 5 } }}>
            <ForgotPasswordForm locale={locale} />
          </CardContent>
        </Stack>
      </Card>
    </Container>
  );
}
