import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import { AppShell } from "@/components/shell/AppShell";
import { getDictionary, isSupportedLocale, SUPPORTED_LOCALES } from "@/lib/i18n";

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    return {};
  }
  return {
    title: {
      default: "easylinkjobs",
      template: "%s | easylinkjobs"
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        zh: "/zh",
        bn: "/bn"
      }
    }
  };
}

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  const dictionary = getDictionary(locale);
  return (
    <AuthSessionProvider>
      <AppShell locale={locale} dictionary={dictionary}>{children}</AppShell>
    </AuthSessionProvider>
  );
}
