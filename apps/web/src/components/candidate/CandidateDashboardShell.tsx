"use client";

import AssignmentIndRounded from "@mui/icons-material/AssignmentIndRounded";
import DescriptionRounded from "@mui/icons-material/DescriptionRounded";
import HomeRounded from "@mui/icons-material/HomeRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

import type { AppLocale } from "@/lib/i18n";

const navIcons = {
  overview: <HomeRounded fontSize="small" />,
  profile: <AssignmentIndRounded fontSize="small" />,
  documents: <DescriptionRounded fontSize="small" />,
  settings: <SettingsRounded fontSize="small" />,
};

type Props = PropsWithChildren<{
  locale: AppLocale;
}>;

export function CandidateDashboardShell({ locale, children }: Props) {
  const pathname = usePathname();
  const items = [
    { key: "overview", label: "Overview", href: `/${locale}/dashboard/candidate` },
    { key: "profile", label: "Profile", href: `/${locale}/dashboard/candidate/profile` },
    { key: "documents", label: "Documents", href: `/${locale}/dashboard/candidate/documents` },
    { key: "settings", label: "Settings", href: `/${locale}/dashboard/candidate/settings` },
  ] as const;

  return (
    <Container sx={{ py: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} alignItems="flex-start">
        <Card sx={{ width: { xs: "100%", lg: 250 }, position: { lg: "sticky" }, top: { lg: 92 } }}>
          <CardContent sx={{ p: 1.25 }}>
            <Typography variant="h5" sx={{ px: 1.25, pt: 0.5, pb: 1 }}>
              Candidate area
            </Typography>
            <List disablePadding>
              {items.map((item) => {
                const active = pathname === item.href;
                return (
                  <ListItemButton
                    key={item.key}
                    component={Link}
                    href={item.href}
                    selected={active}
                    sx={{ borderRadius: 3, mb: 0.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{navIcons[item.key]}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                );
              })}
            </List>
          </CardContent>
        </Card>
        <Box sx={{ flex: 1, width: "100%" }}>{children}</Box>
      </Stack>
    </Container>
  );
}
