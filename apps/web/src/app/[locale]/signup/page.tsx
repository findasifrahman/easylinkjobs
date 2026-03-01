import type { Metadata } from "next";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDictionary, isSupportedLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Signup" };
}

export default async function SignupChooserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  const dictionary = getDictionary(locale);

  const options = [
    {
      title: dictionary["nav.signupCandidate"],
      body: "Create a jobseeker account with the essentials only, then finish the full profile after signup.",
      href: `/${locale}/signup/candidate`,
      icon: <PersonRounded color="primary" />,
    },
    {
      title: dictionary["nav.signupEmployer"],
      body: "Create a recruiter account with company and contact details, then manage jobs and applicant review from the company dashboard.",
      href: `/${locale}/signup/company`,
      icon: <ApartmentRounded color="secondary" />,
    },
  ];

  return (
    <Container sx={{ py: { xs: 3, md: 6 } }}>
      <Stack spacing={2.5}>
        <Typography variant="h2">{dictionary["auth.signupTitle"]}</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
          Choose the account type first. Candidate signup stays minimal. Employer signup collects the core company and recruiter details up front.
        </Typography>
        <Grid container spacing={2}>
          {options.map((option) => (
            <Grid key={option.href} size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: "100%" }}>
                <CardActionArea component={Link} href={option.href} sx={{ height: "100%" }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={1.5}>
                      {option.icon}
                      <Typography variant="h4">{option.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.body}
                      </Typography>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}
