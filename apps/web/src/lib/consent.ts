export type ConsentPreferences = {
  analytics: boolean;
  marketing: boolean;
};

export const CONSENT_PREF_KEY = "easylinkjobs_cookie_consent";
const CONSENT_COOKIE = "easylinkjobs_cookie_consent";

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function writeCookie(value: string) {
  if (!canUseDom()) {
    return;
  }
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function getConsentAckKey(locale: string) {
  return `easylinkjobs_cookie_consent_seen_${locale}`;
}

export function getConsentPreferences(): ConsentPreferences | null {
  if (!canUseDom()) {
    return null;
  }
  const raw = window.localStorage.getItem(CONSENT_PREF_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentPreferences>;
    return {
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent() {
  return Boolean(getConsentPreferences()?.analytics);
}

export function hasMarketingConsent() {
  return Boolean(getConsentPreferences()?.marketing);
}

export function hasSeenConsent(locale: string) {
  if (!canUseDom()) {
    return false;
  }
  return window.localStorage.getItem(getConsentAckKey(locale)) === "true";
}

export function saveConsentPreferences(locale: string, preferences: ConsentPreferences) {
  if (!canUseDom()) {
    return;
  }
  const payload = JSON.stringify(preferences);
  window.localStorage.setItem(CONSENT_PREF_KEY, payload);
  window.localStorage.setItem(getConsentAckKey(locale), "true");
  writeCookie(payload);
  window.dispatchEvent(new CustomEvent("easylinkjobs-consent-updated", { detail: preferences }));
}
