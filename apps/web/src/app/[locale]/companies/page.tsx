import type { Metadata } from "next";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isSupportedLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Companies",
    description: "Explore verified employers and company profiles."
  };
}

const companies = [
  { slug: "aurora-learning-group", name: "Aurora Learning Group", city: "Shanghai" },
  { slug: "bluepeak-academy", name: "BluePeak Academy", city: "Hangzhou" },
  { slug: "harbor-international-school", name: "Harbor International School", city: "Shenzhen" }
];

export default async function CompaniesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  return (
    <Container sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Typography variant="h2">Verified companies</Typography>
        <Grid container spacing={2.5}>
          {companies.map((company) => (
            <Grid key={company.slug} size={{ xs: 12, md: 6, xl: 4 }}>
              <Card component={Link} href={`/${locale}/companies/${company.slug}`}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={1.5}>
                    <ApartmentRounded color="primary" />
                    <Typography variant="h5">{company.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {company.city}, China
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}
