"use client";

import type { MouseEvent } from "react";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import ArticleRounded from "@mui/icons-material/ArticleRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import HomeWorkRounded from "@mui/icons-material/HomeWorkRounded";
import LoginRounded from "@mui/icons-material/LoginRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import PersonAddAltRounded from "@mui/icons-material/PersonAddAltRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import WorkOutlineRounded from "@mui/icons-material/WorkOutlineRounded";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type PropsWithChildren, useMemo, useState } from "react";

import { ChatbotWidget } from "@/components/ai/ChatbotWidget";
import { ConsentBanner } from "@/components/shell/ConsentBanner";
import { Footer } from "@/components/shell/Footer";
import { TrackingProvider } from "@/components/tracking/TrackingProvider";
import { useAuthSession } from "@/hooks/useAuthSession";
import type { AppLocale, Dictionary } from "@/lib/i18n";
import { themeTokens } from "@/theme";

type Props = PropsWithChildren<{
  locale: AppLocale;
  dictionary: Dictionary;
}>;

const navIcons = {
  jobs: <WorkOutlineRounded fontSize="small" />,
  companies: <ApartmentRounded fontSize="small" />,
  blog: <ArticleRounded fontSize="small" />,
  tutorials: <MenuBookRounded fontSize="small" />,
  about: <HomeWorkRounded fontSize="small" />
};

export function AppShell({ children, locale, dictionary }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, loading } = useAuthSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const navItems = [
    { key: "jobs", href: `/${locale}/jobs`, label: dictionary["nav.jobs"] },
    { key: "companies", href: `/${locale}/companies`, label: dictionary["nav.companies"] },
    { key: "blog", href: `/${locale}/blog`, label: dictionary["nav.blog"] },
    { key: "tutorials", href: `/${locale}/tutorials`, label: dictionary["nav.tutorials"] },
    { key: "about", href: `/${locale}/about`, label: dictionary["nav.about"] }
  ] as const;

  const dashboardHref = useMemo(() => {
    if (!user) return `/${locale}/dashboard`;
    if (user.role_hint === "admin") return `/${locale}/dashboard/admin`;
    if (user.role_hint === "company") return `/${locale}/dashboard/company`;
    return `/${locale}/dashboard/candidate`;
  }, [locale, user]);

  const profileHref = `/${locale}/profile`;

  const displayName = user?.display_name ?? dictionary["brand"];
  const navbarLabel = user?.role_hint === "company" ? "Recruiter" : displayName;
  const avatarLabel = displayName.slice(0, 1).toUpperCase();
  const dashboardLabel = user?.role_hint === "company" ? "Recruiter dashboard" : dictionary["nav.dashboard"];

  function isActive(href: string) {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleLogout() {
    await logout();
    setMenuAnchor(null);
    setMobileOpen(false);
    router.push(`/${locale}`);
    router.refresh();
  }

  function handleMenuOpen(event: MouseEvent<HTMLElement>) {
    setMenuAnchor(event.currentTarget);
  }

  return (
    <TrackingProvider>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(circle at top left, rgba(17,205,222,0.10), transparent 34%), radial-gradient(circle at top right, rgba(253,124,111,0.09), transparent 28%), #F8FBFD"
        }}
      >
        <AppBar position="sticky" sx={{}}>
          <Container>
            <Toolbar disableGutters sx={{ gap: 2, justifyContent: "space-between" }}>
              <Stack component={Link} href={`/${locale}`} direction="row" spacing={1.25} alignItems="center" sx={{ textDecoration: "none" }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                    color: "primary.contrastText",
                    background: "linear-gradient(135deg, rgba(17,205,222,0.95) 0%, rgba(253,124,111,0.92) 100%)"
                  }}
                >
                  E
                </Box>
                <Typography variant="h5" sx={{ display: { xs: "none", sm: "block" }, fontWeight: 800 }}>
                  {dictionary["brand"]}
                </Typography>
              </Stack>

              <Stack
                direction="row"
                spacing={{ xs: 0.5, md: 0.75 }}
                sx={{
                  display: { xs: "none", md: "flex" },
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 999,
                  px: 0.75,
                  py: 0.375,
                  bgcolor: "rgba(255,255,255,0.86)"
                }}
              >
                {navItems.map((item) => (
                  <Button
                    key={item.key}
                    component={Link}
                    href={item.href}
                    color="inherit"
                    startIcon={navIcons[item.key]}
                    sx={{
                      px: 1.25,
                      minHeight: 36,
                      bgcolor: isActive(item.href) ? "rgba(17,205,222,0.10)" : "transparent",
                      color: isActive(item.href) ? "primary.main" : "text.primary"
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>

              <Stack direction="row" spacing={0.75} alignItems="center">
                <IconButton
                  aria-label="Open navigation"
                  onClick={() => setMobileOpen(true)}
                  sx={{ display: { xs: "inline-flex", md: "none" } }}
                >
                  <MenuRounded />
                </IconButton>

                {!isAuthenticated && !loading ? (
                  <>
                    <Button component={Link} href={`/${locale}/login`} color="inherit" startIcon={<LoginRounded />} sx={{ minHeight: 36 }}>
                      {dictionary["nav.login"]}
                    </Button>
                    <Button component={Link} href={`/${locale}/signup/candidate`} variant="outlined" startIcon={<PersonAddAltRounded />} sx={{ minHeight: 36 }}>
                      {dictionary["nav.signupCandidate"]}
                    </Button>
                    <Button component={Link} href={`/${locale}/signup/company`} variant="contained" startIcon={<ApartmentRounded />} sx={{ minHeight: 36 }}>
                      {dictionary["nav.signupEmployer"]}
                    </Button>
                  </>
                ) : isAuthenticated ? (
                  <>
                    <Button
                      color="inherit"
                      onClick={handleMenuOpen}
                      startIcon={
                        <Avatar sx={{ width: 28, height: 28, bgcolor: "rgba(17,205,222,0.14)", color: "primary.main", fontSize: 13, fontWeight: 800 }}>
                          {avatarLabel}
                        </Avatar>
                      }
                      sx={{ minHeight: 36, pl: 0.75, pr: 1.25, maxWidth: 220 }}
                    >
                      <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{navbarLabel}</Box>
                    </Button>
                    <Menu
                      anchorEl={menuAnchor}
                      open={Boolean(menuAnchor)}
                      onClose={() => setMenuAnchor(null)}
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      transformOrigin={{ vertical: "top", horizontal: "right" }}
                    >
                      <MenuItem component={Link} href={dashboardHref} onClick={() => setMenuAnchor(null)}>
                        <ListItemIcon><DashboardRounded fontSize="small" /></ListItemIcon>
                        {dashboardLabel}
                      </MenuItem>
                      <MenuItem component={Link} href={profileHref} onClick={() => setMenuAnchor(null)}>
                        <ListItemIcon><PersonRounded fontSize="small" /></ListItemIcon>
                        {dictionary["nav.profile"]}
                      </MenuItem>
                      <MenuItem onClick={() => void handleLogout()}>
                        <ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>
                        {dictionary["nav.logout"]}
                      </MenuItem>
                    </Menu>
                  </>
                ) : (
                  <Box sx={{ width: 88 }} />
                )}
              </Stack>
            </Toolbar>
          </Container>
        </AppBar>

        <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}>
          <Box sx={{ width: 300, p: 2.5 }}>
            <Stack spacing={2}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {dictionary["brand"]}
              </Typography>
              <Divider />
              <List disablePadding>
                {navItems.map((item) => (
                  <ListItemButton
                    key={item.key}
                    component={Link}
                    href={item.href}
                    selected={isActive(item.href)}
                    onClick={() => setMobileOpen(false)}
                    sx={{ borderRadius: 3, mb: 0.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{navIcons[item.key]}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
              </List>
              <Divider />
              {!isAuthenticated && !loading ? (
                <Stack spacing={1}>
                  <Button component={Link} href={`/${locale}/login`} variant="outlined" onClick={() => setMobileOpen(false)}>
                    {dictionary["nav.login"]}
                  </Button>
                  <Button component={Link} href={`/${locale}/signup/candidate`} variant="outlined" onClick={() => setMobileOpen(false)}>
                    {dictionary["nav.signupCandidate"]}
                  </Button>
                  <Button component={Link} href={`/${locale}/signup/company`} variant="contained" onClick={() => setMobileOpen(false)}>
                    {dictionary["nav.signupEmployer"]}
                  </Button>
                </Stack>
              ) : isAuthenticated ? (
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 0.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: "rgba(17,205,222,0.14)", color: "primary.main", fontSize: 14, fontWeight: 800 }}>
                      {avatarLabel}
                    </Avatar>
                    <Typography variant="body2">{navbarLabel}</Typography>
                  </Stack>
                  <Button component={Link} href={dashboardHref} variant="outlined" startIcon={<DashboardRounded />} onClick={() => setMobileOpen(false)}>
                    {dashboardLabel}
                  </Button>
                  <Button component={Link} href={profileHref} variant="outlined" startIcon={<PersonRounded />} onClick={() => setMobileOpen(false)}>
                    {dictionary["nav.profile"]}
                  </Button>
                  <Button variant="text" color="inherit" startIcon={<LogoutRounded />} onClick={() => void handleLogout()}>
                    {dictionary["nav.logout"]}
                  </Button>
                </Stack>
              ) : (
                <Box sx={{ minHeight: 40 }} />
              )}
            </Stack>
          </Box>
        </Drawer>

        <Box component="main" sx={{ flex: 1, pt: { xs: 1, md: 1.5 } }}>
          {children}
        </Box>

        <Footer locale={locale} dictionary={dictionary} />
        <ConsentBanner locale={locale} dictionary={dictionary} />
        <ChatbotWidget locale={locale} />
      </Box>
    </TrackingProvider>
  );
}
