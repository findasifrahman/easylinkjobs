import type { Metadata } from "next";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { CompanySignupForm } from "@/components/auth/CompanySignupForm";
import { getDictionary, isSupportedLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Employer Signup" };
}

export default async function CompanySignupPage({
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
      <Card sx={{ maxWidth: 1040, mx: "auto", overflow: "hidden" }}>
        <Stack direction={{ xs: "column", md: "row" }}>
          <Stack
            spacing={2}
            sx={{
              flex: 1,
              p: { xs: 3, md: 4 },
              background: "linear-gradient(145deg, rgba(17,205,222,0.12), rgba(253,124,111,0.18))",
            }}
          >
            <ApartmentRounded color="secondary" />
            <Typography variant="h2">{dictionary["auth.companySignupTitle"]}</Typography>
            <Typography color="text.secondary">
              This follows the practical recruiter-account pattern: company identity, recruiter contact, address, and login credentials in one compact form.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              After signup, the company can update its profile, post jobs, and review candidate pipelines. Super admins can approve company verification separately.
            </Typography>
          </Stack>
          <CardContent sx={{ flex: 1.2, p: { xs: 3, md: 4 } }}>
            <CompanySignupForm locale={locale} />
          </CardContent>
        </Stack>
      </Card>
    </Container>
  );
}
