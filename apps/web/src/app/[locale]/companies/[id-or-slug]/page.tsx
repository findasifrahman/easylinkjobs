import type { Metadata } from "next";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import Diversity3Rounded from "@mui/icons-material/Diversity3Rounded";
import PublicRounded from "@mui/icons-material/PublicRounded";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { isSupportedLocale } from "@/lib/i18n";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; "id-or-slug": string }>;
}): Promise<Metadata> {
  const { "id-or-slug": slug } = await params;
  return { title: `Company • ${slug}` };
}

export default async function CompanyDetailPage({
  params
}: {
  params: Promise<{ locale: string; "id-or-slug": string }>;
}) {
  const resolved = await params;
  if (!isSupportedLocale(resolved.locale)) {
    notFound();
  }

  return (
    <Container sx={{ py: { xs: 3, md: 5 } }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={2.5}>
                <Typography variant="h2">Aurora Learning Group</Typography>
                <Typography color="text.secondary">
                  A verified employer profile built for trust: public overview, core benefits, open roles, and hiring signals.
                </Typography>
                <Grid container spacing={2}>
                  {[
                    { icon: <CheckCircleRounded color="primary" />, title: "Verified", text: "Business documents reviewed" },
                    { icon: <PublicRounded color="primary" />, title: "Foreigner-friendly", text: "Sponsors international hires" },
                    { icon: <Diversity3Rounded color="primary" />, title: "Team mix", text: "18 nationalities represented" }
                  ].map((item) => (
                    <Grid key={item.title} size={{ xs: 12, md: 4 }}>
                      <Card variant="outlined">
                        <CardContent sx={{ p: 2.5 }}>
                          <Stack spacing={1.5}>
                            {item.icon}
                            <Typography variant="h6">{item.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.text}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
