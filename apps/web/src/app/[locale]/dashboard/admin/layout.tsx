import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { isSupportedLocale } from "@/lib/i18n";

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  return <AdminShell locale={locale}>{children}</AdminShell>;
}
