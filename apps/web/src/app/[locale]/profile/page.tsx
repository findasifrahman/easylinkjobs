import { notFound } from "next/navigation";

import { ProfileHub } from "@/components/profile/ProfileHub";
import { getDictionary, isSupportedLocale } from "@/lib/i18n";

export default async function ProfilePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  return <ProfileHub locale={locale} dictionary={getDictionary(locale)} />;
}
