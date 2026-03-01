"use client";

import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

import { getConsentPreferences, hasSeenConsent, saveConsentPreferences } from "@/lib/consent";
import type { Dictionary } from "@/lib/i18n";

type Props = {
  locale: string;
  dictionary: Dictionary;
};

export function ConsentBanner({ locale, dictionary }: Props) {
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const prefs = getConsentPreferences();
    if (prefs) {
      setAnalytics(prefs.analytics);
      setMarketing(prefs.marketing);
    }
    setOpen(!hasSeenConsent(locale));
  }, [locale]);

  useEffect(() => {
    function handleOpen() {
      const prefs = getConsentPreferences();
      if (prefs) {
        setAnalytics(prefs.analytics);
        setMarketing(prefs.marketing);
      }
      setCustomize(true);
      setOpen(true);
    }

    window.addEventListener("easylinkjobs-open-consent", handleOpen);
    return () => {
      window.removeEventListener("easylinkjobs-open-consent", handleOpen);
    };
  }, []);

  if (!open) {
    return null;
  }

  return (
    <Card
      sx={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 1450,
        maxWidth: 780,
        mx: "auto",
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: 10,
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={1.5}>
          <Typography variant="h5">{dictionary["consent.title"]}</Typography>
          <Typography variant="body2" color="text.secondary">
            {dictionary["consent.body"]}
          </Typography>
          {customize ? (
            <Stack spacing={0.5}>
              <FormControlLabel control={<Switch checked disabled />} label={dictionary["consent.necessary"]} />
              <FormControlLabel control={<Switch checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />} label={dictionary["consent.analytics"]} />
              <FormControlLabel control={<Switch checked={marketing} onChange={(event) => setMarketing(event.target.checked)} />} label={dictionary["consent.marketing"]} />
            </Stack>
          ) : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <Button
              variant="contained"
              onClick={() => {
                setAnalytics(true);
                setMarketing(true);
                saveConsentPreferences(locale, { analytics: true, marketing: true });
                setOpen(false);
              }}
            >
              {dictionary["consent.acceptAll"]}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setAnalytics(false);
                setMarketing(false);
                saveConsentPreferences(locale, { analytics: false, marketing: false });
                setOpen(false);
              }}
            >
              {dictionary["consent.reject"]}
            </Button>
            <Button
              variant={customize ? "contained" : "text"}
              color={customize ? "secondary" : "inherit"}
              onClick={() => {
                if (customize) {
                  saveConsentPreferences(locale, { analytics, marketing });
                  setOpen(false);
                } else {
                  setCustomize(true);
                }
              }}
            >
              {customize ? dictionary["consent.saveChoices"] : dictionary["consent.customize"]}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
