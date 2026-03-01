"use client";

import { PropsWithChildren, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { hasAnalyticsConsent, hasMarketingConsent } from "@/lib/consent";

const COOKIE_NAME = "anonymous_id";
const SESSION_KEY = "easylinkjobs_session_id";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function trackEvent(eventName: string, properties?: Record<string, unknown>): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  if (!hasAnalyticsConsent()) {
    return;
  }
  let anonymousId = readCookie(COOKIE_NAME);
  if (!anonymousId) {
    anonymousId = createId();
    writeCookie(COOKIE_NAME, anonymousId);
  }
  let sessionId = window.sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = createId();
    window.sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  await fetch(`/api/tracking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_name: eventName,
      anonymous_id: anonymousId,
      session_id: sessionId,
      page_url: window.location.href,
      referrer: document.referrer || null,
      properties
    })
  }).catch(() => undefined);

  if (hasMarketingConsent()) {
    void ["meta", "tiktok", "google"].map((pixel) => ({ pixel, eventName }));
  }
}

export function TrackingProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      void trackEvent("page_view", { pathname });
    }, 250);
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname]);

  return children;
}
