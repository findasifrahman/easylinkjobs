"use client";

import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import ManageSearchRounded from "@mui/icons-material/ManageSearchRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid2";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  createCompanyJob,
  deleteCompanyJob,
  fetchCompanies,
  fetchCompanyJobsTable,
  fetchPublicCategories,
  updateCompanyJob,
} from "@/lib/api";
import { useAuthSession } from "@/hooks/useAuthSession";

type AnyRecord = Record<string, unknown>;

type JobFormState = {
  company_id: string;
  category_id: string;
  title: string;
  description: string;
  language_code: string;
  city: string;
  province: string;
  country: string;
  currency: string;
  salary_min: string;
  salary_max: string;
  visa_sponsorship: boolean;
  foreigner_eligible: boolean;
  work_permit_support: boolean;
  chinese_required_level: string;
  english_required: boolean;
  relocation_support: boolean;
  housing_provided: boolean;
  experience_years: string;
  education_level: string;
  job_type: string;
  remote_policy: string;
  contact_visibility_policy: string;
  headcount: string;
  application_deadline: string;
  special_instructions: string;
};

const defaultForm = (companyId = ""): JobFormState => ({
  company_id: companyId,
  category_id: "",
  title: "",
  description: "",
  language_code: "EN",
  city: "Shanghai",
  province: "",
  country: "China",
  currency: "CNY",
  salary_min: "18000",
  salary_max: "26000",
  visa_sponsorship: true,
  foreigner_eligible: true,
  work_permit_support: true,
  chinese_required_level: "NONE",
  english_required: true,
  relocation_support: false,
  housing_provided: false,
  experience_years: "1",
  education_level: "BACHELORS",
  job_type: "FULL_TIME",
  remote_policy: "ONSITE",
  contact_visibility_policy: "APPLICANTS_ONLY",
  headcount: "1",
  application_deadline: "",
  special_instructions: "",
});

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toDatetimeLocal(value: unknown): string {
  const text = readString(value);
  if (!text) {
    return "";
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function isOpenJob(value: unknown): boolean {
  const text = readString(value);
  if (!text) {
    return true;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return true;
  }
  return date.getTime() >= Date.now();
}

export function CompanyJobsSection() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthSession();
  const localePrefix = pathname?.split("/").filter(Boolean)[0] ?? "en";
  const [companyId, setCompanyId] = useState("");
  const [pager, setPager] = useState({ page: 0, pageSize: 10 });
  const [jobs, setJobs] = useState<{ items: AnyRecord[]; total: number }>({ items: [], total: 0 });
  const [categories, setCategories] = useState<AnyRecord[]>([]);
  const [form, setForm] = useState<JobFormState>(defaultForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const memberships = Array.isArray(user?.company_memberships) ? (user.company_memberships as AnyRecord[]) : [];
      if (memberships.length > 0) {
        const nextCompanyId = readString(memberships[0]?.id);
        setCompanyId(nextCompanyId);
        setForm(defaultForm(nextCompanyId));
      } else {
        const list = await fetchCompanies();
        const nextCompanyId = readString(list[0]?.id);
        setCompanyId(nextCompanyId);
        setForm(defaultForm(nextCompanyId));
      }
      const loadedCategories = await fetchPublicCategories("en");
      setCategories(loadedCategories);
    })();
  }, [user]);

  useEffect(() => {
    if (!companyId) {
      return;
    }
    void (async () => {
      const result = await fetchCompanyJobsTable(companyId, { page: pager.page + 1, pageSize: pager.pageSize });
      setJobs({ items: result.items, total: result.total });
    })();
  }, [companyId, pager]);

  function updateField<K extends keyof JobFormState>(key: K, value: JobFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function reloadJobs() {
    if (!companyId) {
      return;
    }
    const result = await fetchCompanyJobsTable(companyId, { page: pager.page + 1, pageSize: pager.pageSize });
    setJobs({ items: result.items, total: result.total });
  }

  async function submitForm() {
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        ...form,
        company_id: companyId,
        category_id: form.category_id || null,
        salary_min: Number(form.salary_min),
        salary_max: Number(form.salary_max),
        headcount: Number(form.headcount),
        experience_years: Number(form.experience_years),
        application_deadline: new Date(form.application_deadline).toISOString(),
        benefits: {
          housing: form.housing_provided,
          relocation: form.relocation_support,
        },
        screening_questions: {
          questions: ["Share your visa status.", "What is your earliest joining date?"],
        },
      };
      if (editingId) {
        await updateCompanyJob(editingId, payload);
        setSuccess("Job updated. It remains pending super admin approval.");
      } else {
        await createCompanyJob(payload);
        setSuccess("Job submitted. Super admin approval is required before publication.");
      }
      setOpen(false);
      setEditingId(null);
      setForm(defaultForm(companyId));
      await reloadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save job");
    }
  }

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: "title", headerName: "Role", flex: 1.4, minWidth: 220 },
      {
        field: "category",
        headerName: "Category",
        minWidth: 160,
        valueGetter: (_, row) => {
          const categoryId = readString(row.categoryId);
          const match = categories.find((item) => readString(item.id) === categoryId);
          return readString(match?.name, readString(match?.slug, "Unassigned"));
        },
      },
      {
        field: "deadline",
        headerName: "Deadline",
        minWidth: 170,
        valueGetter: (_, row) =>
          row.applicationDeadline ? new Date(readString(row.applicationDeadline)).toLocaleString() : "Missing",
      },
      {
        field: "status",
        headerName: "Review",
        minWidth: 170,
        valueGetter: (_, row) => (readBoolean(row.isPublished) ? "Approved / live" : "Pending admin approval"),
      },
      {
        field: "createdAt",
        headerName: "Created",
        minWidth: 170,
        valueGetter: (_, row) => new Date(readString(row.createdAt)).toLocaleString(),
      },
      {
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        minWidth: 260,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ py: 0.5, width: "100%" }}>
            <Button
              size="small"
              startIcon={<EditRounded fontSize="small" />}
              sx={{ minWidth: 0, px: 0.75 }}
              onClick={() => {
                const row = params.row as AnyRecord;
                setEditingId(readString(row.id));
                setForm({
                  company_id: companyId,
                  category_id: readString(row.categoryId),
                  title: readString(row.title),
                  description: readString(row.description),
                  language_code: readString(row.languageCode, "EN"),
                  city: readString(row.city),
                  province: readString(row.province),
                  country: readString(row.country, "China"),
                  currency: readString(row.currency, "CNY"),
                  salary_min: String(row.salaryMin ?? ""),
                  salary_max: String(row.salaryMax ?? ""),
                  visa_sponsorship: readBoolean(row.visaSponsorship),
                  foreigner_eligible: readBoolean(row.foreignerEligible, true),
                  work_permit_support: readBoolean(row.workPermitSupport),
                  chinese_required_level: readString(row.chineseRequiredLevel, "NONE"),
                  english_required: readBoolean(row.englishRequired, true),
                  relocation_support: readBoolean(row.relocationSupport),
                  housing_provided: readBoolean(row.housingProvided),
                  experience_years: String(row.experienceYears ?? ""),
                  education_level: readString(row.educationLevel, "BACHELORS"),
                  job_type: readString(row.jobType, "FULL_TIME"),
                  remote_policy: readString(row.remotePolicy, "ONSITE"),
                  contact_visibility_policy: readString(row.contactVisibilityPolicy, "APPLICANTS_ONLY"),
                  headcount: String(row.headcount ?? "1"),
                  application_deadline: toDatetimeLocal(row.applicationDeadline),
                  special_instructions:
                    typeof row.metadata === "object" && row.metadata && "special_instructions" in (row.metadata as AnyRecord)
                      ? readString((row.metadata as AnyRecord).special_instructions)
                      : "",
                });
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteOutlineRounded fontSize="small" />}
              sx={{ minWidth: 0, px: 0.75 }}
              onClick={async () => {
                await deleteCompanyJob(readString(params.row.id), companyId);
                await reloadJobs();
              }}
            >
              Delete
            </Button>
            {isOpenJob(params.row.applicationDeadline) ? (
              <Button
                size="small"
                startIcon={<ManageSearchRounded fontSize="small" />}
                sx={{ minWidth: 0, px: 0.75 }}
                onClick={() => {
                  const categoryId = readString(params.row.categoryId);
                  const title = readString(params.row.title);
                  const search = new URLSearchParams();
                  if (categoryId) {
                    search.set("category_id", categoryId);
                  }
                  if (title) {
                    search.set("q", title);
                  }
                  router.push(`/${localePrefix}/dashboard/company/candidates?${search.toString()}`);
                }}
              >
                Get candidates
              </Button>
            ) : null}
          </Stack>
        ),
      },
    ],
    [categories, companyId, localePrefix, router]
  );

  return (
    <Stack spacing={2.5}>
      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Stack spacing={0.75}>
              <Typography variant="h3">Job postings</Typography>
              <Typography color="text.secondary">
                Every employer-submitted job enters pending review. A super admin must approve it before it goes live.
              </Typography>
            </Stack>
            <Button variant="contained" onClick={() => setOpen(true)}>
              New job post
            </Button>
          </Stack>
          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
          {success ? <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert> : null}
        </CardContent>
      </Card>

      <Alert severity="info" icon={<InfoOutlined fontSize="inherit" />}>
        Application deadline is mandatory. Expired jobs are automatically hidden from the public job feed.
      </Alert>

      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 0 }}>
          <DataGrid
            autoHeight
          rows={jobs.items}
          columns={columns}
          disableRowSelectionOnClick
          paginationMode="server"
          rowCount={jobs.total}
          pageSizeOptions={[10, 25, 50]}
          paginationModel={pager}
          onPaginationModelChange={(model) => setPager({ page: model.page, pageSize: model.pageSize })}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaders": { borderRadius: 0, backgroundColor: "rgba(15,23,42,0.03)" },
              "& .MuiDataGrid-cell": { alignItems: "center" },
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? "Edit job post" : "Create job post"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField fullWidth label="Role title" value={form.title} onChange={(event) => updateField("title", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Category"
                value={form.category_id}
                onChange={(event) => updateField("category_id", event.target.value)}
              >
                <MenuItem value="">Select</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={readString(category.id)} value={readString(category.id)}>
                    {readString(category.name, readString(category.slug))}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={5}
                label="Job description"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="City" value={form.city} onChange={(event) => updateField("city", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Province" value={form.province} onChange={(event) => updateField("province", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Country" value={form.country} onChange={(event) => updateField("country", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Salary min" type="number" value={form.salary_min} onChange={(event) => updateField("salary_min", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Salary max" type="number" value={form.salary_max} onChange={(event) => updateField("salary_max", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField fullWidth label="Currency" value={form.currency} onChange={(event) => updateField("currency", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Application deadline"
                InputLabelProps={{ shrink: true }}
                value={form.application_deadline}
                onChange={(event) => updateField("application_deadline", event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Job type" value={form.job_type} onChange={(event) => updateField("job_type", event.target.value)}>
                <MenuItem value="FULL_TIME">Full time</MenuItem>
                <MenuItem value="PART_TIME">Part time</MenuItem>
                <MenuItem value="CONTRACT">Contract</MenuItem>
                <MenuItem value="INTERNSHIP">Internship</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Remote policy" value={form.remote_policy} onChange={(event) => updateField("remote_policy", event.target.value)}>
                <MenuItem value="ONSITE">Onsite</MenuItem>
                <MenuItem value="HYBRID">Hybrid</MenuItem>
                <MenuItem value="REMOTE">Remote</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Education level" value={form.education_level} onChange={(event) => updateField("education_level", event.target.value)}>
                <MenuItem value="HIGH_SCHOOL">High school</MenuItem>
                <MenuItem value="DIPLOMA">Diploma / Associate</MenuItem>
                <MenuItem value="BACHELORS">Bachelor</MenuItem>
                <MenuItem value="MASTERS">Master</MenuItem>
                <MenuItem value="PHD">Doctorate / PhD</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Experience years" type="number" value={form.experience_years} onChange={(event) => updateField("experience_years", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Headcount" type="number" value={form.headcount} onChange={(event) => updateField("headcount", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Chinese level" value={form.chinese_required_level} onChange={(event) => updateField("chinese_required_level", event.target.value)}>
                <MenuItem value="NONE">None</MenuItem>
                <MenuItem value="BASIC">Basic</MenuItem>
                <MenuItem value="INTERMEDIATE">Intermediate</MenuItem>
                <MenuItem value="HSK4">HSK4</MenuItem>
                <MenuItem value="HSK5">HSK5</MenuItem>
                <MenuItem value="FLUENT">Fluent</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Contact visibility" value={form.contact_visibility_policy} onChange={(event) => updateField("contact_visibility_policy", event.target.value)}>
                <MenuItem value="PUBLIC">Public</MenuItem>
                <MenuItem value="APPLICANTS_ONLY">Applicants only</MenuItem>
                <MenuItem value="PREMIUM_ONLY">Premium only</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Language" value={form.language_code} onChange={(event) => updateField("language_code", event.target.value)}>
                <MenuItem value="EN">English</MenuItem>
                <MenuItem value="ZH">Chinese</MenuItem>
                <MenuItem value="BN">Bangla</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Foreigner eligible" value={form.foreigner_eligible ? "yes" : "no"} onChange={(event) => updateField("foreigner_eligible", event.target.value === "yes")}>
                <MenuItem value="yes">Foreigner eligible</MenuItem>
                <MenuItem value="no">Local only</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Visa sponsorship" value={form.visa_sponsorship ? "yes" : "no"} onChange={(event) => updateField("visa_sponsorship", event.target.value === "yes")}>
                <MenuItem value="yes">Provided</MenuItem>
                <MenuItem value="no">Not provided</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Work permit support" value={form.work_permit_support ? "yes" : "no"} onChange={(event) => updateField("work_permit_support", event.target.value === "yes")}>
                <MenuItem value="yes">Supported</MenuItem>
                <MenuItem value="no">Not supported</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="English required" value={form.english_required ? "yes" : "no"} onChange={(event) => updateField("english_required", event.target.value === "yes")}>
                <MenuItem value="yes">Required</MenuItem>
                <MenuItem value="no">Not required</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Relocation support" value={form.relocation_support ? "yes" : "no"} onChange={(event) => updateField("relocation_support", event.target.value === "yes")}>
                <MenuItem value="yes">Provided</MenuItem>
                <MenuItem value="no">Not provided</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Housing provided" value={form.housing_provided ? "yes" : "no"} onChange={(event) => updateField("housing_provided", event.target.value === "yes")}>
                <MenuItem value="yes">Provided</MenuItem>
                <MenuItem value="no">Not provided</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Special instructions"
                value={form.special_instructions}
                onChange={(event) => updateField("special_instructions", event.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setOpen(false);
              setEditingId(null);
              setForm(defaultForm(companyId));
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!form.title || !form.description || !form.category_id || !form.application_deadline}
            onClick={() => void submitForm()}
          >
            {editingId ? "Save changes" : "Submit for approval"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
