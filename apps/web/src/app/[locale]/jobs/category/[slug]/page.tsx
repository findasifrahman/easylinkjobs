import { redirect } from "next/navigation";

export default async function JobCategoryPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  redirect(`/${locale}/jobs?category=${encodeURIComponent(slug)}`);
}
