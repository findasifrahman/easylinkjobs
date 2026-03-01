"use client";

import AssignmentIndRounded from "@mui/icons-material/AssignmentIndRounded";
import BusinessRounded from "@mui/icons-material/BusinessRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import LoginRounded from "@mui/icons-material/LoginRounded";
import ShieldRounded from "@mui/icons-material/ShieldRounded";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { useAuthSession } from "@/hooks/useAuthSession";
import type { AppLocale, Dictionary } from "@/lib/i18n";
import { themeTokens } from "@/theme";

type ProfileHubProps = {
  locale: AppLocale;
  dictionary: Dictionary;
};

export function ProfileHub({ locale, dictionary }: ProfileHubProps) {
  const { loading, user, isAuthenticated } = useAuthSession();

  if (loading) {
    return (
      <Container sx={{ py: { xs: 2.5, md: 4 } }}>
        <Typography color="text.secondary">{dictionary["profile.loading"]}</Typography>
      </Container>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Container sx={{ py: { xs: 2.5, md: 4 } }}>
        <Card>
          <CardContent sx={{ p: themeTokens.layout.cardPadding.spacious }}>
            <Stack spacing={2}>
              <Typography variant="h2">{dictionary["profile.title"]}</Typography>
              <Typography color="text.secondary">
                {dictionary["profile.guestBody"]}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Button component={Link} href={`/${locale}/login`} variant="contained" startIcon={<LoginRounded />}>
                  {dictionary["nav.login"]}
                </Button>
                <Button component={Link} href={`/${locale}/signup`} variant="outlined">
                  {dictionary["nav.signup"]}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const globalPermissions = user.permission_summary?.global ?? [];
  const companyPermissions = Object.values(user.permission_summary?.by_company ?? {}).flat();
  const canAccessAdmin = globalPermissions.includes("admin:access");
  const canAccessCompany = companyPermissions.some((permission) =>
    permission === "jobs:create" || permission === "applications:read"
  );
  const canAccessCandidate = Boolean(user.candidate_id);

  const dashboardHref = canAccessAdmin
    ? `/${locale}/dashboard/admin`
    : canAccessCompany
      ? `/${locale}/dashboard/company`
      : `/${locale}/dashboard/candidate`;

  const roleLabel = canAccessAdmin
    ? dictionary["profile.roleAdmin"]
    : canAccessCompany
      ? dictionary["profile.roleCompany"]
      : dictionary["profile.roleCandidate"];

  const roleIcon =
    user.role_hint === "admin"
      ? <ShieldRounded fontSize="small" />
      : user.role_hint === "company"
        ? <BusinessRounded fontSize="small" />
        : <AssignmentIndRounded fontSize="small" />;

  return (
    <Container sx={{ py: { xs: 2.5, md: 4 } }}>
      <Stack spacing={2.5}>
        <Card>
          <CardContent sx={{ p: themeTokens.layout.cardPadding.spacious }}>
            <Stack spacing={2.25}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ width: 44, height: 44, bgcolor: "rgba(17,205,222,0.14)", color: "primary.main", fontWeight: 800 }}>
                    {user.display_name.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Stack spacing={0.5}>
                    <Typography variant="h2">{user.display_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Stack>
                </Stack>
                <Chip icon={roleIcon} label={roleLabel} color="primary" variant="outlined" />
              </Stack>

              <Typography color="text.secondary">
                {dictionary["profile.hubBody"]}
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Button component={Link} href={dashboardHref} variant="contained" startIcon={<DashboardRounded />}>
                  {dictionary["profile.openDashboard"]}
                </Button>
                {canAccessCompany && typeof user.primary_company?.slug === "string" ? (
                  <Button component={Link} href={`/${locale}/companies/${user.primary_company.slug}`} variant="outlined" startIcon={<BusinessRounded />}>
                    {dictionary["profile.viewCompany"]}
                  </Button>
                ) : null}
                {canAccessCandidate ? (
                  <Button component={Link} href={`/${locale}/dashboard/candidate`} variant="outlined" startIcon={<AssignmentIndRounded />}>
                    {dictionary["profile.viewCandidate"]}
                  </Button>
                ) : null}
                <Button component={Link} href={`/${locale}/profile/settings`} variant="text">
                  {dictionary["profile.settings"]}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
