"use client";

import FacebookRounded from "@mui/icons-material/FacebookRounded";
import Instagram from "@mui/icons-material/Instagram";
import LinkedIn from "@mui/icons-material/LinkedIn";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import type { AppLocale, Dictionary } from "@/lib/i18n";

type FooterProps = {
  locale: AppLocale;
  dictionary: Dictionary;
};

export function Footer({ locale, dictionary }: FooterProps) {
  const links = [
    { label: dictionary["nav.jobs"], href: `/${locale}/jobs` },
    { label: dictionary["nav.companies"], href: `/${locale}/companies` },
    { label: dictionary["nav.blog"], href: `/${locale}/blog` },
    { label: dictionary["nav.tutorials"], href: `/${locale}/tutorials` },
    { label: dictionary["nav.about"], href: `/${locale}/about` },
    { label: dictionary["nav.privacy"], href: `/${locale}/privacy` },
    { label: dictionary["nav.terms"], href: `/${locale}/terms` },
  ];

  return (
    <Box
      component="footer"
      sx={{
        mt: { xs: 6, md: 7 },
        py: 4,
        background: "linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.92))",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container>
        <Stack spacing={3}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 34,
                height: 34,
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
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {dictionary["brand"]}
            </Typography>
          </Stack>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "flex-start" }}
          >
            <Stack spacing={1.5} sx={{ maxWidth: 320 }}>
              <Typography variant="body2" color="text.secondary">
                {dictionary["footer.address"]}
              </Typography>
              <Typography
                component="button"
                type="button"
                variant="body2"
                color="text.secondary"
                onClick={() => window.dispatchEvent(new Event("easylinkjobs-open-consent"))}
                sx={{
                  p: 0,
                  border: 0,
                  bgcolor: "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                {dictionary["footer.cookieSettings"]}
              </Typography>
              <Typography component="a" href={`mailto:${dictionary["footer.email"]}`} variant="body2" color="text.secondary" sx={{ textDecoration: "none" }}>
                {dictionary["footer.email"]}
              </Typography>
            </Stack>

            <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ maxWidth: 520 }}>
              {links.map((item) => (
                <Typography key={item.href} component={Link} href={item.href} variant="body2" sx={{ textDecoration: "none" }}>
                  {item.label}
                </Typography>
              ))}
            </Stack>

            <Stack direction="row" spacing={0.5}>
              {[FacebookRounded, Instagram, LinkedIn].map((Icon, index) => (
                <IconButton key={index} size="small" color="inherit" aria-label="Social link placeholder">
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Stack>
          </Stack>

          <Divider />

          <Typography variant="body2" color="text.secondary">
            {dictionary["footer.tagline"]}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
