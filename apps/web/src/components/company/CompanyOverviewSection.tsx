"use client";

import BarChartRounded from "@mui/icons-material/BarChartRounded";
import PendingActionsRounded from "@mui/icons-material/PendingActionsRounded";
import RemoveRedEyeRounded from "@mui/icons-material/RemoveRedEyeRounded";
import TaskAltRounded from "@mui/icons-material/TaskAltRounded";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { useEffect, useMemo, useState } from "react";

import { fetchCompanies, fetchCompanyJobs, fetchCompanyOverview } from "@/lib/api";
import { useAuthSession } from "@/hooks/useAuthSession";

type AnyRecord = Record<string, unknown>;

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function CompanyOverviewSection() {
  const { user } = useAuthSession();
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [overview, setOverview] = useState({ views: 0, applies: 0, shortlisted: 0 });
  const [jobs, setJobs] = useState<AnyRecord[]>([]);

  useEffect(() => {
    void (async () => {
      const memberships = Array.isArray(user?.company_memberships) ? (user.company_memberships as AnyRecord[]) : [];
      if (memberships.length > 0) {
        setCompanyId(readString(memberships[0]?.id));
        setCompanyName(readString(memberships[0]?.name, "Company"));
        return;
      }
      const list = await fetchCompanies();
      if (list.length > 0) {
        setCompanyId(readString(list[0]?.id));
        setCompanyName(readString(list[0]?.name, "Company"));
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!companyId) {
      return;
    }
    void (async () => {
      const [nextOverview, nextJobs] = await Promise.all([fetchCompanyOverview(companyId), fetchCompanyJobs(companyId)]);
      setOverview(nextOverview);
      setJobs(nextJobs);
    })();
  }, [companyId]);

  const pendingJobs = useMemo(
    () => jobs.filter((job) => !readBoolean(job.isPublished)).length,
    [jobs]
  );

  return (
    <Stack spacing={2.5}>
      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
            <Stack spacing={0.75}>
              <Typography variant="overline" color="primary.main">
                Recruiter dashboard
              </Typography>
              <Typography variant="h3">{companyName || "Recruiter workspace"}</Typography>
              <Typography color="text.secondary">
                Track applicant flow, pending approvals, and active posting volume from one place.
              </Typography>
            </Stack>
            <Chip label={`${pendingJobs} pending admin approval`} variant="outlined" color="secondary" />
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {[
          { label: "Job views", value: overview.views, icon: <RemoveRedEyeRounded color="primary" /> },
          { label: "Applications", value: overview.applies, icon: <BarChartRounded color="primary" /> },
          { label: "Shortlisted", value: overview.shortlisted, icon: <TaskAltRounded color="primary" /> },
          { label: "Pending review", value: pendingJobs, icon: <PendingActionsRounded color="primary" /> },
        ].map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 6, xl: 3 }}>
            <Card sx={{ borderRadius: 1, height: "100%" }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  {item.icon}
                  <Typography variant="h4">{item.value}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {item.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Typography variant="h4">Applicant flow</Typography>
            <BarChart
              height={300}
              borderRadius={2}
              xAxis={[{ scaleType: "band", data: ["Views", "Applications", "Shortlisted"] }]}
              series={[
                {
                  data: [overview.views, overview.applies, overview.shortlisted],
                  color: "#11CDDE",
                },
              ]}
              margin={{ left: 40, right: 10, top: 20, bottom: 28 }}
            />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
