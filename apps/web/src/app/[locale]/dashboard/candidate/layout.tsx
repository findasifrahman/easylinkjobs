import { notFound } from "next/navigation";

import { CandidateDashboardShell } from "@/components/candidate/CandidateDashboardShell";
import { isSupportedLocale } from "@/lib/i18n";

export default async function CandidateDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  return <CandidateDashboardShell locale={locale}>{children}</CandidateDashboardShell>;
}
