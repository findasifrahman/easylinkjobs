"use client";

import AccountCircleRounded from "@mui/icons-material/AccountCircleRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import ManageSearchRounded from "@mui/icons-material/ManageSearchRounded";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
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
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  fetchCompanies,
  fetchPublicCategories,
  fetchRecruiterCandidateProfile,
  fetchRecruiterCandidates,
} from "@/lib/api";
import { useAuthSession } from "@/hooks/useAuthSession";

type AnyRecord = Record<string, unknown>;

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

export function CompanyCandidateSearchSection() {
  const { user } = useAuthSession();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category_id") ?? "";
  const initialQuery = searchParams.get("q") ?? "";

  const [companyId, setCompanyId] = useState("");
  const [categories, setCategories] = useState<AnyRecord[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [pager, setPager] = useState({ page: 0, pageSize: 12 });
  const [data, setData] = useState<{ items: AnyRecord[]; total: number; premiumEnabled: boolean }>({
    items: [],
    total: 0,
    premiumEnabled: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<AnyRecord | null>(null);

  useEffect(() => {
    void (async () => {
      const memberships = Array.isArray(user?.company_memberships) ? (user.company_memberships as AnyRecord[]) : [];
      if (memberships.length > 0) {
        setCompanyId(readString(memberships[0]?.id));
      } else {
        const companies = await fetchCompanies();
        if (companies.length > 0) {
          setCompanyId(readString(companies[0]?.id));
        }
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
      setError(null);
      try {
        const result = await fetchRecruiterCandidates(companyId, {
          q: query || undefined,
          categoryId: categoryId || undefined,
          page: pager.page + 1,
          pageSize: pager.pageSize,
        });
        setData({
          items: result.items,
          total: result.total,
          premiumEnabled: result.premium_enabled,
        });
      } catch (nextError) {
        setData({ items: [], total: 0, premiumEnabled: false });
        setError(nextError instanceof Error ? nextError.message : "Could not load recruiter candidate search.");
      }
    })();
  }, [categoryId, companyId, pager, query]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: "full_name",
        headerName: "Candidate",
        flex: 1.15,
        minWidth: 220,
      },
      {
        field: "desired_job_titles",
        headerName: "Target roles",
        flex: 1,
        minWidth: 220,
        valueGetter: (_, row) => (Array.isArray(row.desired_job_titles) ? row.desired_job_titles.slice(0, 3).join(", ") : ""),
      },
      {
        field: "skills",
        headerName: "Skills",
        flex: 1,
        minWidth: 220,
        valueGetter: (_, row) => (Array.isArray(row.skills) ? row.skills.slice(0, 4).join(", ") : ""),
      },
      {
        field: "years_experience",
        headerName: "Experience",
        minWidth: 110,
        valueGetter: (_, row) => `${readNumber(row.years_experience)} yrs`,
      },
      {
        field: "profile_completion_score",
        headerName: "Profile",
        minWidth: 100,
        valueGetter: (_, row) => `${readNumber(row.profile_completion_score)}%`,
      },
    ],
    []
  );

  async function openCandidate(candidateId: string) {
    if (!companyId) {
      return;
    }
    const detail = await fetchRecruiterCandidateProfile(companyId, candidateId);
    setCandidateProfile(detail);
    setSelectedCandidateId(candidateId);
  }

  const profileData = candidateProfile?.profile as AnyRecord | undefined;

  return (
    <Stack spacing={2.5}>
      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={1.25}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <ManageSearchRounded color="primary" />
              <Typography variant="h3">Recruiter candidate search</Typography>
            </Stack>
            <Typography color="text.secondary">
              Search CVs by role keywords or category. Premium-enabled recruiters can browse candidate profiles without exposing direct contact details.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {error ? (
        <Alert severity="info" icon={<LockRounded fontSize="inherit" />}>
          {error}
        </Alert>
      ) : null}

      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              fullWidth
              label="Search candidates"
              placeholder="Teacher, software engineer, accounting"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <TextField
              select
              label="Category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              sx={{ minWidth: 260 }}
            >
              <MenuItem value="">All categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={readString(category.id)} value={readString(category.id)}>
                  {readString(category.name, readString(category.slug))}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              onClick={() => setPager((current) => ({ ...current, page: 0 }))}
              sx={{ minWidth: 132 }}
            >
              Search
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 0 }}>
          <DataGrid
            autoHeight
            rows={data.items}
            columns={columns}
            getRowId={(row) => readString((row as AnyRecord).candidate_id)}
            disableRowSelectionOnClick
            paginationMode="server"
            rowCount={data.total}
            pageSizeOptions={[12, 24, 48]}
            paginationModel={pager}
            onPaginationModelChange={(model) => setPager({ page: model.page, pageSize: model.pageSize })}
            onRowClick={(params) => void openCandidate(readString((params.row as AnyRecord).candidate_id))}
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaders": { borderRadius: 0, backgroundColor: "rgba(17,205,222,0.06)" },
              "& .MuiDataGrid-row": { cursor: "pointer" },
            }}
          />
        </CardContent>
      </Card>

      <Drawer anchor="right" open={Boolean(selectedCandidateId)} onClose={() => setSelectedCandidateId(null)}>
        <Stack sx={{ width: { xs: 340, md: 520 }, p: 3 }} spacing={2.25}>
          {candidateProfile ? (
            <>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {readString(profileData?.profile_image_url) ? (
                  <Box
                    component="img"
                    src={readString(profileData?.profile_image_url)}
                    alt={readString(profileData?.full_name, "Candidate")}
                    sx={{ width: 76, height: 76, borderRadius: 1, objectFit: "cover" }}
                  />
                ) : (
                  <Avatar sx={{ width: 76, height: 76, bgcolor: "rgba(17,205,222,0.12)", color: "primary.main" }}>
                    <AccountCircleRounded sx={{ fontSize: 46 }} />
                  </Avatar>
                )}
                <Stack spacing={0.4}>
                  <Typography variant="h4">{readString(profileData?.full_name, "Candidate")}</Typography>
                  <Typography color="text.secondary">
                    {readString(profileData?.nationality, "Nationality not provided")}
                    {readString(profileData?.current_city) || readString(profileData?.current_country)
                      ? ` • ${[readString(profileData?.current_city), readString(profileData?.current_country)].filter(Boolean).join(", ")}`
                      : ""}
                  </Typography>
                  <Chip label={`${readNumber(profileData?.profile_completion_score)}% complete`} size="small" color="primary" />
                </Stack>
              </Stack>

              <Alert severity="info" icon={<LockRounded fontSize="inherit" />}>
                Contact details stay hidden in recruiter search. Unlocking contact requires the application pipeline view.
              </Alert>

              <Card variant="outlined" sx={{ borderRadius: 1 }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="h5">Summary</Typography>
                    <Typography color="text.secondary">
                      {readString(profileData?.headline, "No summary has been added yet.")}
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {Array.isArray(profileData?.desired_job_titles) && profileData.desired_job_titles.length > 0 ? (
                        (profileData.desired_job_titles as unknown[]).map((item) => (
                          <Chip key={String(item)} label={String(item)} size="small" />
                        ))
                      ) : (
                        <Chip label="Target roles pending" size="small" />
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 1 }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="h5">Experience</Typography>
                    {Array.isArray(candidateProfile.experiences) && candidateProfile.experiences.length > 0 ? (
                      (candidateProfile.experiences as AnyRecord[]).map((item, index) => (
                        <Stack key={`${readString(item.id)}-${index}`} spacing={0.25}>
                          <Typography variant="body1">{readString(item.jobTitle, "Role not set")}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {readString(item.companyName, "Employer")} • {readString(item.locationCity)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {readString(item.description, "No description")}
                          </Typography>
                        </Stack>
                      ))
                    ) : (
                      <Typography color="text.secondary">No experience added yet.</Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 1 }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="h5">Education</Typography>
                    {Array.isArray(candidateProfile.education) && candidateProfile.education.length > 0 ? (
                      (candidateProfile.education as AnyRecord[]).map((item, index) => (
                        <Stack key={`${readString(item.id)}-${index}`} spacing={0.25}>
                          <Typography variant="body1">{readString(item.degree, readString(item.degreeType, "Qualification"))}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {readString(item.institution, "Institution")} • {readString(item.country)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {readString(item.cgpa) ? `CGPA ${readString(item.cgpa)}` : "CGPA not provided"}
                          </Typography>
                        </Stack>
                      ))
                    ) : (
                      <Typography color="text.secondary">No education records added yet.</Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 1 }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="h5">Skills and certifications</Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {Array.isArray(candidateProfile.skills) && candidateProfile.skills.length > 0 ? (
                        (candidateProfile.skills as AnyRecord[]).map((item) => (
                          <Chip key={readString(item.id)} label={readString(item.name)} size="small" />
                        ))
                      ) : (
                        <Chip label="Skills pending" size="small" />
                      )}
                    </Stack>
                    {Array.isArray(candidateProfile.certifications) && candidateProfile.certifications.length > 0 ? (
                      <Stack spacing={0.5}>
                        {(candidateProfile.certifications as AnyRecord[]).map((item) => (
                          <Typography key={readString(item.id)} variant="body2" color="text.secondary">
                            {readString(item.name)} • {readString(item.issuingOrg, "Issuer not set")}
                          </Typography>
                        ))}
                      </Stack>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            </>
          ) : null}
        </Stack>
      </Drawer>
    </Stack>
  );
}
