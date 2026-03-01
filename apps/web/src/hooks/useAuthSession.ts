"use client";

import { useContext } from "react";

import { AuthSessionContext } from "@/components/auth/AuthSessionProvider";

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (context === null) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return context;
}
