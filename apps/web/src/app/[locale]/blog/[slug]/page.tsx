import type { Metadata } from "next";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";

import { isSupportedLocale } from "@/lib/i18n";
import { fetchBlogPost } from "@/lib/server-api";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  return {
    title: slug,
    alternates: {
      canonical: `/${locale}/blog/${slug}`
    }
  };
}

export default async function BlogDetailPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const post = await fetchBlogPost(slug).catch(() => null);
  if (!post) notFound();

  return (
    <Container sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={2.5}>
        <Typography variant="h2">{String(post.title)}</Typography>
        <Typography color="text.secondary">{String(post.excerpt ?? "")}</Typography>
        <ReactMarkdown>{String(post.content)}</ReactMarkdown>
      </Stack>
    </Container>
  );
}
