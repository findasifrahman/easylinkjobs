"use client";

import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import RateReviewRounded from "@mui/icons-material/RateReviewRounded";
import BlockRounded from "@mui/icons-material/BlockRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Drawer from "@mui/material/Drawer";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";

import {
  addApplicationNote,
  fetchApplicationNotes,
  fetchCompanies,
  fetchCompanyApplicantsTable,
  fetchCompanyJobs,
  updateApplicationStatus,
} from "@/lib/api";
import { useAuthSession } from "@/hooks/useAuthSession";

type AnyRecord = Record<string, unknown>;

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function CompanyApplicantsSection() {
  const { user } = useAuthSession();
  const [companyId, setCompanyId] = useState("");
  const [jobs, setJobs] = useState<AnyRecord[]>([]);
  const [pager, setPager] = useState({ page: 0, pageSize: 10 });
  const [rows, setRows] = useState<{ items: AnyRecord[]; total: number }>({ items: [], total: 0 });
  const [canViewContact, setCanViewContact] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [jobFilter, setJobFilter] = useState("ALL");
  const [selected, setSelected] = useState<AnyRecord | null>(null);
  const [notes, setNotes] = useState<AnyRecord[]>([]);
  const [noteDraft, setNoteDraft] = useState("");

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

  async function loadApplicants(nextCompanyId: string, nextStatus: string, nextJob: string, nextPager = pager) {
    const [jobItems, response] = await Promise.all([
      fetchCompanyJobs(nextCompanyId),
      fetchCompanyApplicantsTable(nextCompanyId, {
        statusFilter: nextStatus === "ALL" ? undefined : nextStatus,
        jobId: nextJob === "ALL" ? undefined : nextJob,
        page: nextPager.page + 1,
        pageSize: nextPager.pageSize,
      }),
    ]);
    setJobs(jobItems);
    setRows({ items: response.items, total: response.total });
    setCanViewContact(response.can_view_contact);
  }

  useEffect(() => {
    if (!companyId) {
      return;
    }
    void loadApplicants(companyId, statusFilter, jobFilter, pager);
  }, [companyId, statusFilter, jobFilter, pager]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: "candidate",
        headerName: "Candidate",
        flex: 1.2,
        minWidth: 220,
        valueGetter: (_, row) => readString((row.summary as AnyRecord | undefined)?.name, "Unnamed candidate"),
      },
      {
        field: "nationality",
        headerName: "Nationality",
        minWidth: 140,
        valueGetter: (_, row) => readString((row.summary as AnyRecord | undefined)?.nationality, "Pending"),
      },
      {
        field: "experience",
        headerName: "Experience",
        minWidth: 130,
        valueGetter: (_, row) => `${readNumber((row.summary as AnyRecord | undefined)?.years_experience)} yrs`,
      },
      {
        field: "completion",
        headerName: "Profile",
        minWidth: 120,
        valueGetter: (_, row) => `${readNumber((row.summary as AnyRecord | undefined)?.completion_score)}%`,
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 130,
      },
      {
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        minWidth: 260,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.75}>
            <Button
              size="small"
              startIcon={<CheckCircleOutlineRounded fontSize="small" />}
              onClick={async () => {
                await updateApplicationStatus(readString(params.row.application_id), "SHORTLISTED", companyId);
                await loadApplicants(companyId, statusFilter, jobFilter, pager);
              }}
            >
              Shortlist
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<BlockRounded fontSize="small" />}
              onClick={async () => {
                await updateApplicationStatus(readString(params.row.application_id), "REJECTED", companyId);
                await loadApplicants(companyId, statusFilter, jobFilter, pager);
              }}
            >
              Reject
            </Button>
            <Button
              size="small"
              startIcon={<RateReviewRounded fontSize="small" />}
              onClick={async () => {
                setSelected(params.row as AnyRecord);
                const loadedNotes = await fetchApplicationNotes(readString(params.row.application_id), companyId);
                setNotes(loadedNotes);
                setNoteDraft("");
              }}
            >
              Review
            </Button>
          </Stack>
        ),
      },
    ],
    [companyId, jobFilter, statusFilter]
  );

  return (
    <Stack spacing={2.5}>
      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Stack spacing={0.75}>
              <Typography variant="h3">Applicants</Typography>
              <Typography color="text.secondary">
                Review candidate summaries, change pipeline status, and keep recruiter notes on the same record.
              </Typography>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <TextField
                select
                size="small"
                label="Job"
                value={jobFilter}
                onChange={(event) => {
                  setJobFilter(event.target.value);
                  setPager((current) => ({ ...current, page: 0 }));
                }}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="ALL">All jobs</MenuItem>
                {jobs.map((job) => (
                  <MenuItem key={readString(job.id)} value={readString(job.id)}>
                    {readString(job.title, "Untitled role")}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPager((current) => ({ ...current, page: 0 }));
                }}
                sx={{ minWidth: 160 }}
              >
                {["ALL", "APPLIED", "SHORTLISTED", "INTERVIEW", "OFFER", "HIRED", "REJECTED"].map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {!canViewContact ? (
        <Alert severity="info" icon={<LockRounded fontSize="inherit" />}>
          Direct phone and email stay hidden until a premium entitlement or contact unlock is active.
        </Alert>
      ) : null}

      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 0 }}>
          <DataGrid
            autoHeight
            rows={rows.items}
            columns={columns}
            getRowId={(row) => readString((row as AnyRecord).application_id)}
            disableRowSelectionOnClick
            paginationMode="server"
            rowCount={rows.total}
            pageSizeOptions={[10, 25, 50]}
            paginationModel={pager}
            onPaginationModelChange={(model) => setPager({ page: model.page, pageSize: model.pageSize })}
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaders": { borderRadius: 0, backgroundColor: "rgba(15,23,42,0.03)" },
            }}
          />
        </CardContent>
      </Card>

      <Drawer anchor="right" open={Boolean(selected)} onClose={() => setSelected(null)}>
        <Stack sx={{ width: { xs: 320, sm: 420 }, p: 3 }} spacing={2}>
          {selected ? (
            <>
              <Typography variant="h4">
                {readString((selected.summary as AnyRecord | undefined)?.name, "Candidate")}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {Array.isArray((selected.summary as AnyRecord | undefined)?.skills) &&
                ((selected.summary as AnyRecord | undefined)?.skills as unknown[]).length > 0 ? (
                  ((selected.summary as AnyRecord | undefined)?.skills as unknown[]).map((skill) => (
                    <Chip key={String(skill)} label={String(skill)} size="small" />
                  ))
                ) : (
                  <Chip label="Skills pending" size="small" />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {readString((selected.summary as AnyRecord | undefined)?.nationality, "Nationality pending")} •{" "}
                {readNumber((selected.summary as AnyRecord | undefined)?.years_experience)} years experience
              </Typography>
              {!canViewContact || readBoolean((selected.contact as AnyRecord | undefined)?.locked) ? (
                <Alert severity="warning" icon={<LockRounded fontSize="inherit" />}>
                  Contact details are locked for this account.
                </Alert>
              ) : (
                <Stack spacing={0.5}>
                  <Typography variant="body2">Email: {readString((selected.contact as AnyRecord | undefined)?.email, "Unavailable")}</Typography>
                  <Typography variant="body2">Phone: {readString((selected.contact as AnyRecord | undefined)?.phone, "Unavailable")}</Typography>
                </Stack>
              )}
              <TextField
                label="Recruiter note"
                multiline
                minRows={3}
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
              />
              <Button
                variant="contained"
                disabled={!noteDraft.trim()}
                onClick={async () => {
                  await addApplicationNote(
                    readString(selected.application_id),
                    { body: noteDraft, is_private: true },
                    companyId
                  );
                  setNoteDraft("");
                  setNotes(await fetchApplicationNotes(readString(selected.application_id), companyId));
                }}
              >
                Save note
              </Button>
              <Stack spacing={1}>
                {notes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No recruiter notes yet.
                  </Typography>
                ) : (
                  notes.map((note) => (
                    <Card key={readString(note.id)} variant="outlined" sx={{ borderRadius: 1 }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="body2">{readString(note.body)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {readString(note.createdAt)}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Stack>
            </>
          ) : null}
        </Stack>
      </Drawer>
    </Stack>
  );
}
