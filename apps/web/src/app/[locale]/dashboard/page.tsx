"use client";

import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useAuthSession } from "@/hooks/useAuthSession";
import { hasAuthTokens } from "@/lib/api";

export default function DashboardRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const router = useRouter();
  const { user, loading, refresh } = useAuthSession();
  const retriedRef = useRef(false);

  useEffect(() => {
    let active = true;
    void params.then(({ locale }) => {
      if (!active || loading || !user) {
        if (!loading && !user) {
          if (!retriedRef.current && hasAuthTokens()) {
            retriedRef.current = true;
            void refresh();
            return;
          }
          router.replace(`/${locale}/login`);
        }
        return;
      }
      const hasAdmin = user.permission_summary.global.includes("admin:access");
      const hasCompany = Object.values(user.permission_summary.by_company).flat().some(
        (permission) => permission === "jobs:create" || permission === "applications:read"
      );
      const target = hasAdmin ? "admin" : hasCompany ? "company" : "candidate";
      router.replace(`/${locale}/dashboard/${target}`);
    });
    return () => {
      active = false;
    };
  }, [params, router, user, loading]);

  return (
    <Stack sx={{ minHeight: "40vh" }} alignItems="center" justifyContent="center" spacing={1.5}>
      <CircularProgress size={28} />
      <Typography variant="body2" color="text.secondary">
        Loading dashboard...
      </Typography>
    </Stack>
  );
}
