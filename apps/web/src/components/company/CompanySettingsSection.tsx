"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";

import { changePassword, fetchCompanies, fetchCompanyMembers } from "@/lib/api";
import { useAuthSession } from "@/hooks/useAuthSession";

type AnyRecord = Record<string, unknown>;

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function CompanySettingsSection() {
  const { user } = useAuthSession();
  const [companyId, setCompanyId] = useState("");
  const [pager, setPager] = useState({ page: 0, pageSize: 10 });
  const [data, setData] = useState<{ items: AnyRecord[]; total: number; seat_summary: AnyRecord | null }>({
    items: [],
    total: 0,
    seat_summary: null,
  });
  const [form, setForm] = useState({ current_password: "", new_password: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const memberships = Array.isArray(user?.company_memberships) ? (user.company_memberships as AnyRecord[]) : [];
      if (memberships.length > 0) {
        setCompanyId(readString(memberships[0]?.id));
        return;
      }
      const list = await fetchCompanies();
      if (list.length > 0) {
        setCompanyId(readString(list[0]?.id));
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!companyId) {
      return;
    }
    void fetchCompanyMembers(companyId, { page: pager.page + 1, pageSize: pager.pageSize }).then((result) =>
      setData({ items: result.items, total: result.total, seat_summary: result.seat_summary as AnyRecord })
    );
  }, [companyId, pager]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: "email",
        headerName: "Recruiter",
        flex: 1.2,
        minWidth: 220,
        valueGetter: (_, row) => readString((row.user as AnyRecord | undefined)?.email, "Unknown"),
      },
      {
        field: "title",
        headerName: "Title",
        minWidth: 180,
      },
      {
        field: "role",
        headerName: "Role",
        minWidth: 160,
        valueGetter: (_, row) => readString((row.role as AnyRecord | undefined)?.name, "Role"),
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 120,
      },
      {
        field: "created_at",
        headerName: "Added",
        minWidth: 180,
        valueGetter: (_, row) => new Date(readString(row.created_at)).toLocaleString(),
      },
    ],
    []
  );

  return (
    <Stack spacing={2.5}>
      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={1}>
            <Typography variant="h3">Security and recruiter seats</Typography>
            <Typography color="text.secondary">
              Change your password and monitor how many recruiter seats are in use on this company workspace.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, xl: 5 }}>
          <Card sx={{ borderRadius: 1, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h4">Change password</Typography>
                {error ? <Alert severity="error">{error}</Alert> : null}
                {success ? <Alert severity="success">{success}</Alert> : null}
                <TextField
                  type="password"
                  label="Current password"
                  value={form.current_password}
                  onChange={(event) => setForm((current) => ({ ...current, current_password: event.target.value }))}
                />
                <TextField
                  type="password"
                  label="New password"
                  helperText="Use at least 8 characters with upper, lower, and number."
                  value={form.new_password}
                  onChange={(event) => setForm((current) => ({ ...current, new_password: event.target.value }))}
                />
                <Button
                  variant="contained"
                  disabled={!form.current_password || !form.new_password}
                  onClick={async () => {
                    setError(null);
                    setSuccess(null);
                    try {
                      await changePassword(form);
                      setSuccess("Password updated.");
                      setForm({ current_password: "", new_password: "" });
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Unable to change password");
                    }
                  }}
                >
                  Update password
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, xl: 7 }}>
          <Card sx={{ borderRadius: 1 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
                  <Typography variant="h4">Recruiter seats</Typography>
                  {data.seat_summary ? (
                    <Stack direction="row" spacing={2}>
                      <Typography variant="body2" color="text.secondary">
                        Included: {Number(data.seat_summary.included_seats ?? 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Used: {Number(data.seat_summary.used_seats ?? 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Available: {Number(data.seat_summary.available_seats ?? 0)}
                      </Typography>
                    </Stack>
                  ) : null}
                </Stack>
                {Boolean(data.seat_summary?.requires_upgrade) ? (
                  <Alert severity="warning">
                    Your included recruiter seats are fully used. Upgrade your plan to add more active recruiters.
                  </Alert>
                ) : null}
                <DataGrid
                  autoHeight
                  rows={data.items}
                  columns={columns}
                  disableRowSelectionOnClick
                  paginationMode="server"
                  rowCount={data.total}
                  pageSizeOptions={[10, 25, 50]}
                  paginationModel={pager}
                  onPaginationModelChange={(model) => setPager({ page: model.page, pageSize: model.pageSize })}
                  sx={{
                    border: 0,
                    "& .MuiDataGrid-columnHeaders": { borderRadius: 0, backgroundColor: "rgba(15,23,42,0.03)" },
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
