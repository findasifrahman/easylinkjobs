"use client";

import type { ReactNode } from "react";
import ArchiveRounded from "@mui/icons-material/ArchiveRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import AutoStoriesRounded from "@mui/icons-material/AutoStoriesRounded";
import BusinessRounded from "@mui/icons-material/BusinessRounded";
import CategoryRounded from "@mui/icons-material/CategoryRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import LocalOfferRounded from "@mui/icons-material/LocalOfferRounded";
import TimelineRounded from "@mui/icons-material/TimelineRounded";
import WorkRounded from "@mui/icons-material/WorkRounded";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
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

const icons: Record<string, ReactNode> = {
  overview: <DashboardRounded fontSize="small" />,
  users: <GroupsRounded fontSize="small" />,
  companies: <BusinessRounded fontSize="small" />,
  jobs: <WorkRounded fontSize="small" />,
  taxonomy: <CategoryRounded fontSize="small" />,
  tracking: <TimelineRounded fontSize="small" />,
  archive: <ArchiveRounded fontSize="small" />,
  premium: <LocalOfferRounded fontSize="small" />,
  content: <AutoStoriesRounded fontSize="small" />,
};

type Props = {
  locale: AppLocale;
  children: ReactNode;
};

export function AdminShell({ locale, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, refresh } = useAuthSession();
  const retriedRef = useRef(false);
  const items = [
    { key: "overview", label: "Overview", href: `/${locale}/dashboard/admin` },
    { key: "users", label: "Users", href: `/${locale}/dashboard/admin/users` },
    { key: "companies", label: "Companies", href: `/${locale}/dashboard/admin/companies` },
    { key: "jobs", label: "Jobs", href: `/${locale}/dashboard/admin/jobs` },
    { key: "taxonomy", label: "Categories / Taxonomy", href: `/${locale}/dashboard/admin/taxonomy` },
    { key: "tracking", label: "Tracking events", href: `/${locale}/dashboard/admin/tracking` },
    { key: "archive", label: "Archive control", href: `/${locale}/dashboard/admin/archive` },
    { key: "premium", label: "Premium controls", href: `/${locale}/dashboard/admin/premium` },
    { key: "content", label: "Content", href: `/${locale}/dashboard/admin/content` },
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
    if (!user.permission_summary.global.includes("admin:access")) {
      const hasCompany = Object.values(user.permission_summary.by_company).flat().some(
        (permission) => permission === "jobs:create" || permission === "applications:read"
      );
      router.replace(`/${locale}/dashboard/${hasCompany ? "company" : "candidate"}`);
    }
  }, [loading, user, router, locale]);

  if (loading || !user || !user.permission_summary.global.includes("admin:access")) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: "40vh" }}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            Loading admin console...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: "column", xl: "row" }} spacing={2.5} alignItems="flex-start">
        <Stack sx={{ width: { xs: "100%", xl: 280 }, position: { xl: "sticky" }, top: { xl: 88 } }} spacing={2}>
          <AppBar position="static" color="transparent" elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 4 }}>
            <Toolbar sx={{ minHeight: "64px !important", gap: 1.25, alignItems: "center" }}>
              <AutoAwesomeRounded color="primary" />
              <Stack spacing={0.25}>
                <Typography variant="h5">Admin console</Typography>
                <Typography variant="body2" color="text.secondary">Routed moderation and analytics</Typography>
              </Stack>
            </Toolbar>
          </AppBar>
          <Card sx={{ width: "100%" }}>
            <CardContent sx={{ p: 1.25 }}>
              <List disablePadding>
                {items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <ListItemButton key={item.key} component={Link} href={item.href} selected={active} sx={{ borderRadius: 3, mb: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>{icons[item.key]}</ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Stack>
        <Box sx={{ flex: 1, width: "100%" }}>{children}</Box>
      </Stack>
    </Container>
  );
}
