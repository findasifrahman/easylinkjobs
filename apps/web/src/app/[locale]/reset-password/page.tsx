import type { Metadata } from "next";
import PasswordRounded from "@mui/icons-material/PasswordRounded";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { isSupportedLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Reset Password" };
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  const { token } = await searchParams;

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
            <PasswordRounded color="primary" />
            <Typography variant="h2">Choose a new password</Typography>
            <Typography color="text.secondary">
              Reset links are one-time use and expire after two hours.
            </Typography>
          </Stack>
          <CardContent sx={{ flex: 1, p: { xs: 3, md: 5 } }}>
            <ResetPasswordForm locale={locale} token={token ?? ""} />
          </CardContent>
        </Stack>
      </Card>
    </Container>
  );
}
