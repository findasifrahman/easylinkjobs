import type { Metadata } from "next";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isSupportedLocale } from "@/lib/i18n";
import { fetchBlogPosts } from "@/lib/server-api";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Blog",
    alternates: {
      canonical: `/${locale}/blog`
    }
  };
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const data = await fetchBlogPosts().catch(() => ({ items: [] as Array<Record<string, unknown>> }));

  return (
    <Container sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h2">Blog</Typography>
          <Typography color="text.secondary">Editorial content, market notes, and migration strategy articles.</Typography>
        </Stack>
        <Grid container spacing={2.5}>
          {data.items.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Typography color="text.secondary">No published posts yet.</Typography>
            </Grid>
          ) : (
            data.items.map((post) => (
              <Grid key={String(post.id)} size={{ xs: 12, md: 6, xl: 4 }}>
                <Card component={Link} href={`/${locale}/blog/${String(post.slug)}`} sx={{ display: "block", height: "100%" }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={1.5}>
                      <Typography variant="h5">{String(post.title)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {String(post.excerpt ?? "Read the latest hiring, visa, and relocation updates.")}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Stack>
    </Container>
  );
}
