"use client";

import type { ReactNode } from "react";
import AssignmentRounded from "@mui/icons-material/AssignmentRounded";
import BusinessRounded from "@mui/icons-material/BusinessRounded";
import ManageSearchRounded from "@mui/icons-material/ManageSearchRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import GroupRounded from "@mui/icons-material/GroupRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import AppBar from "@mui/material/AppBar";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useAuthSession } from "@/hooks/useAuthSession";
import { hasAuthTokens } from "@/lib/api";
import type { AppLocale } from "@/lib/i18n";

const icons = {
  overview: <DashboardRounded fontSize="small" />,
  jobs: <AssignmentRounded fontSize="small" />,
  applicants: <GroupRounded fontSize="small" />,
  candidates: <ManageSearchRounded fontSize="small" />,
  profile: <BusinessRounded fontSize="small" />,
  settings: <SettingsRounded fontSize="small" />,
} as const;

type Props = {
  locale: AppLocale;
  children: ReactNode;
};

export function CompanyShell({ locale, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, refresh } = useAuthSession();
  const retriedRef = useRef(false);
  const items = [
    { key: "overview", label: "Overview", href: `/${locale}/dashboard/company` },
    { key: "jobs", label: "Jobs", href: `/${locale}/dashboard/company/jobs` },
    { key: "applicants", label: "Applicants", href: `/${locale}/dashboard/company/applicants` },
    { key: "candidates", label: "Candidate search", href: `/${locale}/dashboard/company/candidates` },
    { key: "profile", label: "Company profile", href: `/${locale}/dashboard/company/profile` },
    { key: "settings", label: "Settings", href: `/${locale}/dashboard/company/settings` },
  ] as const;

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      if (!retriedRef.current && hasAuthTokens()) {
        retriedRef.current = true;
        void refresh();
        return;
      }
      router.replace(`/${locale}/login`);
      return;
    }
    const hasCompanyAccess = Object.values(user.permission_summary.by_company).some(
      (permissions) => permissions.includes("jobs:create") || permissions.includes("applications:read")
    );
    if (!hasCompanyAccess) {
      router.replace(
        user.permission_summary.global.includes("admin:access")
          ? `/${locale}/dashboard/admin`
          : `/${locale}/dashboard/candidate`
      );
    }
  }, [loading, locale, router, user]);

  if (loading || !user) {
    return (
      <Container sx={{ py: { xs: 4, md: 6 } }}>
        <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: "40vh" }}>
          <CircularProgress size={26} />
            <Typography variant="body2" color="text.secondary">
            Loading recruiter dashboard...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container sx={{ py: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: "column", xl: "row" }} spacing={2.5} alignItems="flex-start">
        <Stack sx={{ width: { xs: "100%", xl: 264 }, position: { xl: "sticky" }, top: { xl: 86 } }} spacing={1.5}>
          <AppBar
            position="static"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              backgroundColor: "background.paper",
              backdropFilter: "none",
            }}
          >
            <Toolbar sx={{ minHeight: "60px !important", px: 2.25, gap: 1.25 }}>
              <BusinessRounded color="primary" />
              <Stack spacing={0.25}>
                <Typography variant="h5">Company workspace</Typography>
                <Typography variant="body2" color="text.secondary">
                  Recruiter dashboard and hiring operations
                </Typography>
              </Stack>
            </Toolbar>
          </AppBar>
          <Card sx={{ borderRadius: 1 }}>
            <CardContent sx={{ p: 1 }}>
              <List disablePadding>
                {items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <ListItemButton
                      key={item.key}
                      component={Link}
                      href={item.href}
                      selected={active}
                      sx={{ borderRadius: 1, mb: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 34 }}>{icons[item.key]}</ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Stack>
        <Stack sx={{ flex: 1, width: "100%" }} spacing={2.5}>
          {children}
        </Stack>
      </Stack>
    </Container>
  );
}
