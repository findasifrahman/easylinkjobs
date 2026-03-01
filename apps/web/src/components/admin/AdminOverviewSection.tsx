"use client";

import AnalyticsRounded from "@mui/icons-material/AnalyticsRounded";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid2";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { BarChart, LineChart } from "@mui/x-charts";
import { useEffect, useState } from "react";

import { useAuthSession } from "@/hooks/useAuthSession";
import { fetchAdminAnalytics } from "@/lib/api";
import { themeTokens } from "@/theme";

const n = (v: unknown, d = 0) => (typeof v === "number" ? v : d);
const s = (v: unknown, d = "") => (typeof v === "string" ? v : d);

export function AdminOverviewSection() {
  const { user } = useAuthSession();
  const [days, setDays] = useState("14");
  const [data, setData] = useState<{ series: Array<Record<string, unknown>>; totals: Record<string, number>; top_sources: Array<Record<string, unknown>>; funnel: Record<string, number>; archive_status: Record<string, number>; } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminAnalytics(Number(days)).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Failed to load analytics"));
  }, [days]);

  return (
    <Stack spacing={2.5}>
      {user ? (
        <Card>
          <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Avatar sx={{ width: 38, height: 38, bgcolor: "rgba(17,205,222,0.14)", color: "primary.main", fontWeight: 800 }}>{user.display_name.slice(0, 1).toUpperCase()}</Avatar>
                <Stack spacing={0.25}><Typography variant="h5">{user.display_name}</Typography><Typography variant="body2" color="text.secondary">{user.email}</Typography></Stack>
              </Stack>
              <Chip label="Super Admin" color="primary" variant="outlined" />
            </Stack>
          </CardContent>
        </Card>
      ) : null}
      <Stack sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, background: "linear-gradient(140deg, rgba(17,205,222,0.14), rgba(253,124,111,0.12) 55%, rgba(255,255,255,0.98))" }} spacing={1.5}>
        <Typography variant="overline" color="primary.main">Overview</Typography>
        <Typography variant="h2">Platform analytics and conversion signals</Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
      <Grid container spacing={2}>
        {[["Visits", n(data?.totals.visits)], ["Signups", n(data?.totals.signups)], ["Applies", n(data?.totals.applies)], ["Job posts", n(data?.totals.job_posts)]].map(([label, value]) => (
          <Grid key={String(label)} size={{ xs: 12, sm: 6, xl: 3 }}><Card><CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}><Typography variant="overline">{label}</Typography><Typography variant="h3">{value}</Typography></CardContent></Card></Grid>
        ))}
      </Grid>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Card><CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}><Typography variant="h5">Traffic and funnel</Typography><TextField select size="small" label="Days" value={days} onChange={(e) => setDays(e.target.value)} sx={{ minWidth: 120 }}>{["14", "30", "60"].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField></Stack>
              <LineChart height={280} series={[{ data: (data?.series ?? []).map((i) => n(i.visits)), label: "Visits", color: "#11CDDE" }, { data: (data?.series ?? []).map((i) => n(i.signups)), label: "Signups", color: "#FD7C6F" }, { data: (data?.series ?? []).map((i) => n(i.applies)), label: "Applies", color: "#2F7D6D" }]} xAxis={[{ scaleType: "point", data: (data?.series ?? []).map((i) => s(i.day)) }]} margin={{ left: 48, right: 16, top: 12, bottom: 24 }} />
              <BarChart height={220} series={[{ data: (data?.top_sources ?? []).map((i) => n(i.count)), label: "Events", color: "#11CDDE" }]} xAxis={[{ scaleType: "band", data: (data?.top_sources ?? []).map((i) => s(i.source)) }]} margin={{ left: 40, right: 8, top: 12, bottom: 40 }} />
            </Stack>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, xl: 4 }}>
          <Card><CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
            <Stack spacing={1.25}><Stack direction="row" spacing={1} alignItems="center"><AnalyticsRounded color="primary" /><Typography variant="h5">Quick summary</Typography></Stack><Chip label={`Signup rate: ${n(data?.funnel.signup_rate)}%`} color="primary" variant="outlined" /><Chip label={`Apply rate: ${n(data?.funnel.apply_rate)}%`} color="primary" variant="outlined" /><Typography variant="body2" color="text.secondary">Archive-ready tracking rows: {n(data?.archive_status.eligible_tracking_count)}.</Typography><Typography variant="body2" color="text.secondary">Archive-ready application rows: {n(data?.archive_status.eligible_application_count)}.</Typography></Stack>
          </CardContent></Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
