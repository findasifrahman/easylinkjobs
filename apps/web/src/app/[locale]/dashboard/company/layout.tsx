import { notFound } from "next/navigation";

import { CompanyShell } from "@/components/company/CompanyShell";
import { isSupportedLocale } from "@/lib/i18n";

export default async function CompanyLayout({
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
  return <CompanyShell locale={locale}>{children}</CompanyShell>;
}
