import en from "@/i18n/en.json";
import zh from "@/i18n/zh.json";
import bn from "@/i18n/bn.json";

export const SUPPORTED_LOCALES = ["en", "zh", "bn"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export type Dictionary = typeof en;

const dictionaries: Record<AppLocale, Dictionary> = {
  en,
  zh,
  bn
};

export function isSupportedLocale(value: string): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}

export function getDictionary(locale: AppLocale): Dictionary {
  return dictionaries[locale];
}
