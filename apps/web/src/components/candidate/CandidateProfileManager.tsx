"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";

import { createCandidateItem, deleteCandidateItem, fetchCandidateProfile, updateCandidateItem, updateCandidateProfile } from "@/lib/api";
import { themeTokens } from "@/theme";

const genderOptions = ["Male", "Female", "Other"] as const;
const visaStatusOptions = ["No visa", "Tourist visa", "Student visa", "Work visa", "Residence permit", "Other"] as const;
const workPermitOptions = ["No permit", "Needs sponsorship", "Has active permit", "Eligible to apply", "Other"] as const;
const englishTestOptions = ["IELTS", "TOEFL", "DUOLINGO", "SAT", "GED", "Other"] as const;
const hskOptions = ["0", "1", "2", "3", "4", "5", "6"] as const;
const degreeTypeOptions = [
  "H.S.C",
  "S.S.C",
  "O Level",
  "A Level",
  "12th Grade",
  "High School",
  "Diploma",
  "B.Sc",
  "Bachelor",
  "Masters",
  "Ph.D",
  "Other",
] as const;

type SectionKey = "education" | "experience" | "skills" | "languages" | "certifications";

type ProfilePayload = Awaited<ReturnType<typeof fetchCandidateProfile>>;

type CrudConfig = {
  section: SectionKey;
  title: string;
  emptyMessage: string;
  fields: Array<{ key: string; label: string; multiline?: boolean }>;
};

const sectionConfigs: CrudConfig[] = [
  {
    section: "education",
    title: "Education",
    emptyMessage: "No education entries yet.",
    fields: [
      { key: "institution", label: "Institution" },
      { key: "degree_type", label: "Qualification type" },
      { key: "degree", label: "Qualification title" },
      { key: "field_of_study", label: "Field of study" },
      { key: "is_ongoing", label: "Ongoing" },
      { key: "passing_year", label: "Passing year" },
      { key: "cgpa", label: "C.GPA" },
      { key: "country", label: "Institution country" },
    ],
  },
  {
    section: "experience",
    title: "Experience",
    emptyMessage: "No experience entries yet.",
    fields: [
      { key: "company_name", label: "Company" },
      { key: "job_title", label: "Job title" },
      { key: "description", label: "Description", multiline: true },
    ],
  },
  {
    section: "skills",
    title: "Skills",
    emptyMessage: "No skills added yet.",
    fields: [
      { key: "name", label: "Skill" },
      { key: "level", label: "Level" },
      { key: "years_of_experience", label: "Years" },
    ],
  },
  {
    section: "languages",
    title: "Languages",
    emptyMessage: "No additional languages added yet.",
    fields: [
      { key: "language", label: "Language" },
      { key: "proficiency", label: "Proficiency" },
      { key: "certification", label: "Certification" },
    ],
  },
  {
    section: "certifications",
    title: "Certifications",
    emptyMessage: "No certifications yet.",
    fields: [
      { key: "name", label: "Certification" },
      { key: "issuing_org", label: "Issuing organization" },
      { key: "credential_url", label: "Credential URL" },
    ],
  },
];

export function CandidateProfileManager() {
  const [payload, setPayload] = useState<ProfilePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingIds, setEditingIds] = useState<Record<SectionKey, string | null>>({
    education: null,
    experience: null,
    skills: null,
    languages: null,
    certifications: null,
  });
  const [drafts, setDrafts] = useState<Record<SectionKey, Record<string, string>>>({
    education: {},
    experience: {},
    skills: {},
    languages: {},
    certifications: {},
  });
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    dob: "",
    father_name: "",
    mother_name: "",
    gender: "",
    phone: "",
    address: "",
    nationality: "",
    current_country: "",
    current_city: "",
    visa_status: "",
    work_permit_status: "",
    ever_been_to_china: "no",
    ever_rejected_china: "no",
    china_education: "no",
    hsk_level: "0",
    english_proficiency_type: "",
    english_score_overall: "",
    desired_job_titles: "",
    desired_cities: "",
    salary_expectation: "",
    summary: "",
  });

  async function load() {
    try {
      const next = await fetchCandidateProfile();
      setPayload(next);
      const profile = next.profile;
      setProfileForm({
        full_name: String(profile.fullName ?? ""),
        dob: profile.dob ? String(profile.dob).slice(0, 10) : "",
        father_name: String(profile.fatherName ?? ""),
        mother_name: String(profile.motherName ?? ""),
        gender: String(profile.gender ?? ""),
        phone: String(profile.phone ?? ""),
        address:
          typeof profile.extensibleData === "object" && profile.extensibleData !== null
            ? String((profile.extensibleData as Record<string, unknown>).address ?? "")
            : "",
        nationality: String(profile.nationality ?? ""),
        current_country: String(profile.currentCountry ?? ""),
        current_city: String(profile.currentCity ?? ""),
        visa_status: String(profile.visaStatus ?? ""),
        work_permit_status: String(profile.workPermitStatus ?? ""),
        ever_been_to_china: profile.everBeenToChina ? "yes" : "no",
        ever_rejected_china: profile.everRejectedChina ? "yes" : "no",
        china_education: profile.chinaEducation ? "yes" : "no",
        hsk_level: String(profile.hskLevel ?? "0"),
        english_proficiency_type: String(profile.englishProficiencyType ?? ""),
        english_score_overall: profile.englishScoreOverall != null ? String(profile.englishScoreOverall) : "",
        desired_job_titles: Array.isArray(profile.desiredJobTitles) ? profile.desiredJobTitles.join(", ") : "",
        desired_cities: Array.isArray(profile.desiredCities) ? profile.desiredCities.join(", ") : "",
        salary_expectation: String(profile.salaryExpectation ?? ""),
        summary: String(profile.summary ?? ""),
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const completionScore = useMemo(() => Number(payload?.completion_score ?? 0), [payload]);

  async function saveProfile() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (!profileForm.full_name.trim() || profileForm.full_name.trim().length < 2) {
        throw new Error("Full name must be at least 2 characters.");
      }
      if (profileForm.phone && !/^[0-9+\-() ]{6,20}$/.test(profileForm.phone)) {
        throw new Error("Enter a valid phone number.");
      }
      if (profileForm.dob) {
        const dob = new Date(profileForm.dob);
        const today = new Date();
        if (Number.isNaN(dob.getTime()) || dob > today) {
          throw new Error("Date of birth must be a valid past date.");
        }
      }
      const response = await updateCandidateProfile({
        full_name: profileForm.full_name,
        dob: profileForm.dob || null,
        father_name: profileForm.father_name || null,
        mother_name: profileForm.mother_name || null,
        gender: profileForm.gender || null,
        phone: profileForm.phone || null,
        address: profileForm.address || null,
        nationality: profileForm.nationality || null,
        current_country: profileForm.current_country || null,
        current_city: profileForm.current_city || null,
        visa_status: profileForm.visa_status || null,
        work_permit_status: profileForm.work_permit_status || null,
        ever_been_to_china: profileForm.ever_been_to_china === "yes",
        ever_rejected_china: profileForm.ever_rejected_china === "yes",
        china_education: profileForm.china_education === "yes",
        hsk_level: Number(profileForm.hsk_level || 0),
        english_proficiency_type: profileForm.english_proficiency_type || null,
        english_score_overall:
          profileForm.english_proficiency_type && profileForm.english_score_overall
            ? Number(profileForm.english_score_overall)
            : null,
        desired_job_titles: profileForm.desired_job_titles.split(",").map((item) => item.trim()).filter(Boolean),
        desired_cities: profileForm.desired_cities.split(",").map((item) => item.trim()).filter(Boolean),
        salary_expectation: profileForm.salary_expectation ? Number(profileForm.salary_expectation) : null,
        summary: profileForm.summary || null,
      });
      setPayload((current) =>
        current
          ? { ...current, profile: response.profile, completion_score: response.completion_score }
          : current
      );
      setSuccess("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSection(section: SectionKey) {
    const draft = drafts[section];
    const itemId = editingIds[section];
    if (!Object.values(draft).some((value) => value.trim())) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const outgoing: Record<string, unknown> =
        section === "education"
          ? {
              ...draft,
              passing_year: draft.passing_year ? Number(draft.passing_year) : null,
              is_ongoing: draft.is_ongoing === "yes",
            }
          : draft;
      if (itemId) {
        await updateCandidateItem(section, itemId, outgoing);
      } else {
        await createCandidateItem(section, outgoing);
      }
      setDrafts((current) => ({ ...current, [section]: {} }));
      setEditingIds((current) => ({ ...current, [section]: null }));
      await load();
      setSuccess(`${section} saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to save ${section}.`);
    } finally {
      setSaving(false);
    }
  }

  async function removeSectionItem(section: SectionKey, itemId: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteCandidateItem(section, itemId);
      if (editingIds[section] === itemId) {
        setEditingIds((current) => ({ ...current, [section]: null }));
        setDrafts((current) => ({ ...current, [section]: {} }));
      }
      await load();
      setSuccess(`${section} deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to delete ${section}.`);
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(section: SectionKey, item: Record<string, unknown>, config: CrudConfig) {
    const nextDraft: Record<string, string> = {};
    for (const field of config.fields) {
      nextDraft[field.key] = String(item[field.key] ?? item[toCamel(field.key)] ?? "");
    }
    setEditingIds((current) => ({ ...current, [section]: String(item.id) }));
    setDrafts((current) => ({ ...current, [section]: nextDraft }));
  }

  if (!payload) {
    return <Alert severity="info">Loading candidate profile manager...</Alert>;
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
      <Card>
        <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
              <div>
                <Typography variant="h5">Profile details</Typography>
                <Typography variant="body2" color="text.secondary">Real-time completion score: {completionScore}%</Typography>
              </div>
              <Button variant="contained" onClick={() => void saveProfile()} disabled={saving}>Save profile</Button>
            </Stack>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Full name" value={profileForm.full_name} onChange={(event) => setProfileForm((c) => ({ ...c, full_name: event.target.value }))} /></Grid>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Date of birth" type="date" InputLabelProps={{ shrink: true }} value={profileForm.dob} onChange={(event) => setProfileForm((c) => ({ ...c, dob: event.target.value }))} /></Grid>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Phone" value={profileForm.phone} onChange={(event) => setProfileForm((c) => ({ ...c, phone: event.target.value }))} /></Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" select label="Gender" value={profileForm.gender} onChange={(event) => setProfileForm((c) => ({ ...c, gender: event.target.value }))}>
                  <MenuItem value="">Prefer not to say</MenuItem>
                  {genderOptions.map((item) => (
                    <MenuItem key={item} value={item}>{item}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Father name" value={profileForm.father_name} onChange={(event) => setProfileForm((c) => ({ ...c, father_name: event.target.value }))} /></Grid>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Mother name" value={profileForm.mother_name} onChange={(event) => setProfileForm((c) => ({ ...c, mother_name: event.target.value }))} /></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Nationality" value={profileForm.nationality} onChange={(event) => setProfileForm((c) => ({ ...c, nationality: event.target.value }))} /></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Current country" value={profileForm.current_country} onChange={(event) => setProfileForm((c) => ({ ...c, current_country: event.target.value }))} /></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Current city" value={profileForm.current_city} onChange={(event) => setProfileForm((c) => ({ ...c, current_city: event.target.value }))} /></Grid>
              <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Address" value={profileForm.address} onChange={(event) => setProfileForm((c) => ({ ...c, address: event.target.value }))} /></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" label="Been to China" value={profileForm.ever_been_to_china} onChange={(event) => setProfileForm((c) => ({ ...c, ever_been_to_china: event.target.value }))}><MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem></TextField></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" label="Rejected by China" value={profileForm.ever_rejected_china} onChange={(event) => setProfileForm((c) => ({ ...c, ever_rejected_china: event.target.value }))}><MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem></TextField></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" label="China education" value={profileForm.china_education} onChange={(event) => setProfileForm((c) => ({ ...c, china_education: event.target.value }))}><MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem></TextField></Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" select label="Visa status" value={profileForm.visa_status} onChange={(event) => setProfileForm((c) => ({ ...c, visa_status: event.target.value }))}>
                  {visaStatusOptions.map((item) => (
                    <MenuItem key={item} value={item}>{item}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" select label="Work permit status" value={profileForm.work_permit_status} onChange={(event) => setProfileForm((c) => ({ ...c, work_permit_status: event.target.value }))}>
                  {workPermitOptions.map((item) => (
                    <MenuItem key={item} value={item}>{item}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth size="small" select label="HSK level" value={profileForm.hsk_level} onChange={(event) => setProfileForm((c) => ({ ...c, hsk_level: event.target.value }))}>
                  {hskOptions.map((item) => (
                    <MenuItem key={item} value={item}>{item === "0" ? "No HSK" : `HSK ${item}`}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="English test"
                  value={profileForm.english_proficiency_type}
                  onChange={(event) =>
                    setProfileForm((c) => ({
                      ...c,
                      english_proficiency_type: event.target.value,
                      english_score_overall: event.target.value ? c.english_score_overall : "",
                    }))
                  }
                >
                  <MenuItem value="">No English test yet</MenuItem>
                  {englishTestOptions.map((item) => (
                    <MenuItem key={item} value={item}>{item}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth disabled={!profileForm.english_proficiency_type} size="small" label="English score" type="number" value={profileForm.english_score_overall} onChange={(event) => setProfileForm((c) => ({ ...c, english_score_overall: event.target.value }))} /></Grid>
              <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Desired roles" value={profileForm.desired_job_titles} onChange={(event) => setProfileForm((c) => ({ ...c, desired_job_titles: event.target.value }))} /></Grid>
              <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Desired cities" value={profileForm.desired_cities} onChange={(event) => setProfileForm((c) => ({ ...c, desired_cities: event.target.value }))} /></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Salary expectation" value={profileForm.salary_expectation} onChange={(event) => setProfileForm((c) => ({ ...c, salary_expectation: event.target.value }))} /></Grid>
              <Grid size={{ xs: 12 }}><TextField fullWidth size="small" multiline minRows={3} label="Summary" value={profileForm.summary} onChange={(event) => setProfileForm((c) => ({ ...c, summary: event.target.value }))} /></Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {sectionConfigs.map((config) => {
        const items = (payload[config.section] as Array<Record<string, unknown>>) ?? [];
        const draft = drafts[config.section];
        return (
          <Card key={config.section}>
            <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
              <Stack spacing={1.5}>
                <Typography variant="h5">{config.title}</Typography>
                {items.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">{config.emptyMessage}</Typography>
                ) : (
                  <Stack spacing={1}>
                    {items.map((item) => (
                      <Card key={String(item.id)} variant="outlined">
                        <CardContent sx={{ p: 1.5 }}>
                          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
                            <div>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {String(item[config.fields[0].key] ?? item[toCamel(config.fields[0].key)] ?? "Entry")}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {config.fields.slice(1).map((field) => String(item[field.key] ?? item[toCamel(field.key)] ?? "")).filter(Boolean).join(" • ") || "Saved entry"}
                              </Typography>
                            </div>
                            <Stack direction="row" spacing={1}>
                              <Button size="small" onClick={() => beginEdit(config.section, item, config)}>Edit</Button>
                              <Button size="small" color="error" onClick={() => void removeSectionItem(config.section, String(item.id))}>Delete</Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
                <Divider />
                <Grid container spacing={1.25}>
                  {config.fields.map((field) => (
                    <Grid key={field.key} size={{ xs: 12, md: field.multiline ? 12 : 4 }}>
                      {config.section === "education" && field.key === "degree_type" ? (
                        <TextField
                          fullWidth
                          size="small"
                          select
                          label={field.label}
                          value={draft[field.key] ?? ""}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [config.section]: { ...current[config.section], [field.key]: event.target.value },
                            }))
                          }
                        >
                          <MenuItem value="">Select degree type</MenuItem>
                          {degreeTypeOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : config.section === "education" && field.key === "is_ongoing" ? (
                        <TextField
                          fullWidth
                          size="small"
                          select
                          label={field.label}
                          value={draft[field.key] ?? "no"}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [config.section]: { ...current[config.section], [field.key]: event.target.value },
                            }))
                          }
                        >
                          <MenuItem value="no">No</MenuItem>
                          <MenuItem value="yes">Yes</MenuItem>
                        </TextField>
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          multiline={field.multiline}
                          minRows={field.multiline ? 3 : undefined}
                          label={field.label}
                          value={draft[field.key] ?? ""}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [config.section]: { ...current[config.section], [field.key]: event.target.value },
                            }))
                          }
                        />
                      )}
                    </Grid>
                  ))}
                </Grid>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" size="small" disabled={saving} onClick={() => void saveSection(config.section)}>
                    {editingIds[config.section] ? "Update entry" : "Add entry"}
                  </Button>
                  {editingIds[config.section] ? (
                    <Button
                      size="small"
                      onClick={() => {
                        setEditingIds((current) => ({ ...current, [config.section]: null }));
                        setDrafts((current) => ({ ...current, [config.section]: {} }));
                      }}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

function toCamel(value: string) {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
