"use client";

import CheckRounded from "@mui/icons-material/CheckRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid2";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import {
  createCandidateItem,
  fetchCandidateProfile,
  presignUpload,
  setAuthTokens,
  signupCandidate,
  updateCandidateProfile,
  uploadFileToSignedUrl
} from "@/lib/api";
import { UploadDropzone } from "@/components/candidate/UploadDropzone";

const genderOptions = ["Male", "Female", "Other"] as const;
const visaStatusOptions = ["No visa", "Tourist visa", "Student visa", "Work visa", "Residence permit", "Other"] as const;
const workPermitOptions = ["No permit", "Needs sponsorship", "Has active permit", "Eligible to apply", "Other"] as const;
const englishTestOptions = ["IELTS", "TOEFL", "DUOLINGO", "SAT", "GED", "Other"] as const;
const hskOptions = ["0", "1", "2", "3", "4", "5", "6"] as const;
const degreeTypeOptions = ["H.S.C", "S.S.C", "O Level", "A Level", "12th Grade", "High School", "Diploma", "B.Sc", "Bachelor", "Masters", "Ph.D", "Other"] as const;

type UploadState = {
  file: File | null;
  progress: number;
};

type FormState = {
  email: string;
  password: string;
  fullName: string;
  nationality: string;
  currentCountry: string;
  dob: string;
  fatherName: string;
  motherName: string;
  gender: string;
  phone: string;
  address: string;
  currentCity: string;
  everBeenToChina: string;
  everRejectedChina: string;
  chinaEducation: string;
  visaStatus: string;
  workPermitStatus: string;
  educationInstitution: string;
  educationDegreeType: string;
  educationDegree: string;
  educationField: string;
  educationPassingYear: string;
  educationCgpa: string;
  educationCountry: string;
  hasExperience: string;
  experienceCompany: string;
  experienceTitle: string;
  skillsCsv: string;
  hskLevel: string;
  englishType: string;
  englishScore: string;
  desiredRoles: string;
  desiredCities: string;
  salaryExpectation: string;
  passportNumber: string;
  passportExpiry: string;
  coverLetterText: string;
};

const stepLabels = [
  "Account",
  "Personal",
  "China history",
  "Education",
  "Experience",
  "Languages",
  "Documents",
  "Preferences"
] as const;

const stepSchemas = [
  z.object({
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    fullName: z.string().min(2, "Full name must be at least 2 characters."),
    nationality: z.string().min(2, "Nationality is required."),
    currentCountry: z.string().min(2, "Current country is required.")
  }),
  z.object({
    dob: z.string().optional(),
    fatherName: z.string().min(2, "Father name must be at least 2 characters."),
    motherName: z.string().min(2, "Mother name must be at least 2 characters."),
    phone: z.string().regex(/^[0-9+\-() ]{6,20}$/, "Enter a valid phone number."),
    currentCity: z.string().min(2, "Current city is required.")
  }),
  z.object({
    visaStatus: z.enum(visaStatusOptions),
    workPermitStatus: z.enum(workPermitOptions),
  }),
  z.object({}),
  z.object({}),
  z.object({
    hskLevel: z.coerce.number().min(0).max(6),
    englishType: z.string().optional(),
    englishScore: z.union([z.literal(""), z.coerce.number().min(0)])
  }),
  z.object({}),
  z.object({
    desiredRoles: z.string().min(2, "Add at least one desired role."),
    desiredCities: z.string().min(2, "Add at least one desired city."),
    salaryExpectation: z.coerce.number().min(1)
  })
];

type CandidateProfileWizardProps = {
  mode?: "signup" | "manage";
};

export function CandidateProfileWizard({ mode = "signup" }: CandidateProfileWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [completionScore, setCompletionScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedCollectionSteps, setSubmittedCollectionSteps] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
    fullName: "",
    nationality: "",
    currentCountry: "",
    dob: "",
    fatherName: "",
    motherName: "",
    gender: "",
    phone: "",
    address: "",
    currentCity: "",
    everBeenToChina: "no",
    everRejectedChina: "no",
    chinaEducation: "no",
    visaStatus: "",
    workPermitStatus: "No permit",
    educationInstitution: "",
    educationDegreeType: "",
    educationDegree: "",
    educationField: "",
    educationPassingYear: "",
    educationCgpa: "",
    educationCountry: "",
    hasExperience: "no",
    experienceCompany: "",
    experienceTitle: "",
    skillsCsv: "",
    hskLevel: "0",
    englishType: "",
    englishScore: "",
    desiredRoles: "",
    desiredCities: "",
    salaryExpectation: "15000",
    passportNumber: "",
    passportExpiry: "",
    coverLetterText: ""
  });
  const stepOffset = mode === "manage" ? 1 : 0;
  const visibleStepLabels = stepLabels.slice(stepOffset);
  const visibleStepSchemas = stepSchemas.slice(stepOffset);
  const [uploads, setUploads] = useState<Record<string, UploadState>>({
    educationDoc: { file: null, progress: 0 },
    passport: { file: null, progress: 0 },
    cv: { file: null, progress: 0 },
    coverLetter: { file: null, progress: 0 },
    certificate: { file: null, progress: 0 }
  });

  const nextAction = useMemo(() => {
    if (completionScore < 40) {
      return "Complete your identity and document sections first.";
    }
    if (completionScore < 75) {
      return "Add language proof and work history to improve recruiter trust.";
    }
    return "You are ready to apply for priority roles.";
  }, [completionScore]);

  useEffect(() => {
    if (mode !== "manage") {
      return;
    }
    fetchCandidateProfile()
      .then((payload) => {
        const profile = payload.profile;
        setCompletionScore(Number(payload.completion_score ?? 0));
        setForm((current) => ({
          ...current,
          fullName: String(profile.fullName ?? current.fullName),
          nationality: String(profile.nationality ?? current.nationality),
          currentCountry: String(profile.currentCountry ?? current.currentCountry),
          currentCity: String(profile.currentCity ?? current.currentCity),
          phone: String(profile.phone ?? current.phone),
          fatherName: String(profile.fatherName ?? current.fatherName),
          motherName: String(profile.motherName ?? current.motherName),
          gender: String(profile.gender ?? current.gender),
          dob: profile.dob ? String(profile.dob).slice(0, 10) : current.dob,
          address: typeof profile.extensibleData === "object" && profile.extensibleData !== null
            ? String((profile.extensibleData as Record<string, unknown>).address ?? current.address)
            : current.address,
          everBeenToChina: profile.everBeenToChina ? "yes" : "no",
          everRejectedChina: profile.everRejectedChina ? "yes" : "no",
          chinaEducation: profile.chinaEducation ? "yes" : "no",
          visaStatus: String(profile.visaStatus ?? current.visaStatus),
          workPermitStatus: String(profile.workPermitStatus ?? current.workPermitStatus),
          hskLevel: String(profile.hskLevel ?? current.hskLevel),
          englishType: String(profile.englishProficiencyType ?? current.englishType),
          englishScore: profile.englishScoreOverall != null ? String(profile.englishScoreOverall) : current.englishScore,
          desiredRoles: Array.isArray(profile.desiredJobTitles) ? profile.desiredJobTitles.join(", ") : current.desiredRoles,
          desiredCities: Array.isArray(profile.desiredCities) ? profile.desiredCities.join(", ") : current.desiredCities,
          salaryExpectation: String(profile.salaryExpectation ?? current.salaryExpectation),
        }));
      })
      .catch(() => undefined);
  }, [mode]);

  const setUploadFile = (key: string, file: File) => {
    setUploads((current) => ({ ...current, [key]: { file, progress: 1 } }));
  };

  const uploadDocument = async (
    key: keyof typeof uploads,
    documentType: "PASSPORT" | "CV" | "COVER_LETTER" | "CERTIFICATE" | "EDUCATION_DOC",
    extraMetadata?: Record<string, unknown>
  ) => {
    const file = uploads[key].file;
    if (!file) {
      return;
    }
    const presigned = await presignUpload({
      filename: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      purpose: "candidate_document",
      document_type: documentType
    });
    await uploadFileToSignedUrl(presigned.upload_url, file, presigned.headers, (progress) => {
      setUploads((current) => ({ ...current, [key]: { ...current[key], progress } }));
    });
    await createCandidateItem("documents", {
      media_asset_id: presigned.asset.id,
      document_type: documentType,
      title: file.name,
      metadata: extraMetadata
    });
  };

  const handleStepSubmit = async () => {
    const effectiveStep = activeStep + stepOffset;
    switch (effectiveStep) {
      case 0: {
        const signup = await signupCandidate({
          email: form.email,
          password: form.password,
          full_name: form.fullName,
          nationality: form.nationality,
          current_country: form.currentCountry
        });
        setAuthTokens(signup.access_token, signup.refresh_token);
        setCompletionScore(signup.profile_completion_score);
        return;
      }
      case 1: {
        const res = await updateCandidateProfile({
          full_name: form.fullName,
          dob: form.dob || null,
          father_name: form.fatherName,
          mother_name: form.motherName,
          gender: form.gender || null,
          phone: form.phone,
          address: form.address,
          nationality: form.nationality,
          current_country: form.currentCountry,
          current_city: form.currentCity
        });
        setCompletionScore(res.completion_score);
        return;
      }
      case 2: {
        const res = await updateCandidateProfile({
          ever_been_to_china: form.everBeenToChina === "yes",
          ever_rejected_china: form.everRejectedChina === "yes",
          china_education: form.chinaEducation === "yes",
          visa_status: form.visaStatus
          ,
          work_permit_status: form.workPermitStatus
        });
        setCompletionScore(res.completion_score);
        return;
      }
      case 3: {
        if (!submittedCollectionSteps.has(3)) {
          const hasEducationDetails = Boolean(
            form.educationInstitution.trim() ||
              form.educationDegreeType.trim() ||
              form.educationDegree.trim() ||
              form.educationField.trim() ||
              form.educationPassingYear.trim() ||
              form.educationCgpa.trim() ||
              form.educationCountry.trim() ||
              uploads.educationDoc.file,
          );
          if (hasEducationDetails) {
            const res = await createCandidateItem("education", {
              institution: form.educationInstitution.trim() || "Not specified",
              degree_type: form.educationDegreeType || null,
              degree: form.educationDegree || null,
              field_of_study: form.educationField || null,
              passing_year: form.educationPassingYear ? Number(form.educationPassingYear) : null,
              cgpa: form.educationCgpa || null,
              country: form.educationCountry || null,
            });
            setCompletionScore(res.completion_score);
          }
          if (uploads.educationDoc.file) {
            await uploadDocument("educationDoc", "EDUCATION_DOC");
          }
          setSubmittedCollectionSteps((current) => new Set(current).add(3));
        }
        return;
      }
      case 4: {
        if (!submittedCollectionSteps.has(4)) {
          if (form.hasExperience === "yes" && (form.experienceCompany.trim() || form.experienceTitle.trim())) {
            const res = await createCandidateItem("experience", {
              company_name: form.experienceCompany.trim() || "Not specified",
              job_title: form.experienceTitle.trim() || "Not specified",
            });
            setCompletionScore(res.completion_score);
          }
          const skills = form.skillsCsv
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          for (const skill of skills) {
            await createCandidateItem("skills", { name: skill });
          }
          setSubmittedCollectionSteps((current) => new Set(current).add(4));
        }
        return;
      }
      case 5: {
        const res = await updateCandidateProfile({
          hsk_level: form.hskLevel === "0" ? null : Number(form.hskLevel),
          english_proficiency_type: form.englishType || null,
          english_score_overall: form.englishType && form.englishScore !== "" ? Number(form.englishScore) : null
        });
        setCompletionScore(res.completion_score);
        return;
      }
      case 6: {
        if (!submittedCollectionSteps.has(6)) {
          await uploadDocument("passport", "PASSPORT", {
            passport_number: form.passportNumber,
            expires_at: form.passportExpiry
          });
          await uploadDocument("cv", "CV");
          if (uploads.coverLetter.file) {
            await uploadDocument("coverLetter", "COVER_LETTER");
          } else if (form.coverLetterText.trim()) {
            await createCandidateItem("documents", {
              document_type: "COVER_LETTER",
              title: "Cover Letter",
              metadata: { text: form.coverLetterText }
            });
          }
          if (uploads.certificate.file) {
            await uploadDocument("certificate", "CERTIFICATE");
          }
          setSubmittedCollectionSteps((current) => new Set(current).add(6));
          const latest = await updateCandidateProfile({});
          setCompletionScore(latest.completion_score);
        }
        return;
      }
      case 7: {
        const res = await updateCandidateProfile({
          desired_job_titles: form.desiredRoles.split(",").map((item) => item.trim()).filter(Boolean),
          desired_cities: form.desiredCities.split(",").map((item) => item.trim()).filter(Boolean),
          salary_expectation: Number(form.salaryExpectation)
        });
        setCompletionScore(res.completion_score);
      }
    }
  };

  const handleNext = async () => {
    setError(null);
    setSuccess(null);
    const schema = visibleStepSchemas[activeStep];
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please complete the required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await handleStepSubmit();
      const isLastStep = activeStep === visibleStepLabels.length - 1;
      if (isLastStep) {
        setSuccess("Profile saved. You can come back and edit these details later.");
      } else {
        setActiveStep((current) => Math.min(current + 1, visibleStepLabels.length - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      sx={{
        maxWidth: 1180,
        mx: "auto",
        background:
          "linear-gradient(150deg, rgba(255,255,255,0.98) 0%, rgba(17,205,222,0.10) 42%, rgba(253,124,111,0.12) 100%)"
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 5 } }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 4.5 }}>
            <Stack spacing={3}>
              <Typography variant="h2">Candidate profile wizard</Typography>
              <Typography color="text.secondary">
                Start with the minimum, then build a complete, recruiter-ready profile in guided steps.
              </Typography>
              <Stepper orientation="vertical" activeStep={activeStep}>
                {visibleStepLabels.map((label, index) => (
                  <Step key={label} completed={index < activeStep}>
                    <StepLabel icon={index < activeStep ? <CheckRounded /> : undefined}>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              <Card variant="outlined">
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h5">{completionScore}% complete</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {nextAction}
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, lg: 7.5 }}>
            <Stack spacing={2.5}>
              {error ? <Alert severity="error">{error}</Alert> : null}
              {success ? <Alert severity="success">{success}</Alert> : null}
              {renderStepFields(activeStep + stepOffset, form, setForm, uploads, setUploadFile)}
              <Stack direction="row" spacing={1.5} justifyContent="space-between">
                <Button disabled={activeStep === 0 || submitting} onClick={() => setActiveStep((current) => current - 1)}>
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  {activeStep === visibleStepLabels.length - 1 ? "Finish profile" : "Continue"}
                </Button>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

function renderStepFields(
  activeStep: number,
  form: FormState,
  setForm: Dispatch<SetStateAction<FormState>>,
  uploads: Record<string, UploadState>,
  setUploadFile: (key: string, file: File) => void
) {
  const bind = (key: keyof FormState) => ({
    value: form[key],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }))
  });

  switch (activeStep) {
    case 0:
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Full name" {...bind("fullName")} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Email" type="email" {...bind("email")} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Password" type="password" {...bind("password")} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Nationality" {...bind("nationality")} /></Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth label="Current country" {...bind("currentCountry")} /></Grid>
        </Grid>
      );
    case 1:
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Date of birth" type="date" InputLabelProps={{ shrink: true }} {...bind("dob")} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Phone" {...bind("phone")} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Father name" {...bind("fatherName")} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Mother name" {...bind("motherName")} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Gender (optional)" {...bind("gender")}>
              <MenuItem value="">Prefer not to say</MenuItem>
              {genderOptions.map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Current city" {...bind("currentCity")} /></Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth label="Address" multiline minRows={2} {...bind("address")} /></Grid>
        </Grid>
      );
    case 2:
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}><TextField select fullWidth label="Been to China" {...bind("everBeenToChina")}><MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem></TextField></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField select fullWidth label="Rejected by China" {...bind("everRejectedChina")}><MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem></TextField></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField select fullWidth label="China education" {...bind("chinaEducation")}><MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem></TextField></Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Visa status" {...bind("visaStatus")}>
              {visaStatusOptions.map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Work permit status" {...bind("workPermitStatus")}>
              {workPermitOptions.map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      );
    case 3:
      return (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth label="Institution (optional)" {...bind("educationInstitution")} /></Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField select fullWidth label="Qualification type" {...bind("educationDegreeType")}>
                <MenuItem value="">Not set</MenuItem>
                {degreeTypeOptions.map((item) => (
                  <MenuItem key={item} value={item}>{item}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}><TextField fullWidth label="Qualification title (optional)" helperText="Example: Computer Science, Business, General Science" {...bind("educationDegree")} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Field of study (optional)" {...bind("educationField")} /></Grid>
            <Grid size={{ xs: 12, sm: 3 }}><TextField fullWidth label="Passing year" type="number" {...bind("educationPassingYear")} /></Grid>
            <Grid size={{ xs: 12, sm: 3 }}><TextField fullWidth label="C.GPA (optional)" {...bind("educationCgpa")} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Institution country" {...bind("educationCountry")} /></Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary">
            You can skip this step now and add academic details later.
          </Typography>
          <UploadDropzone
            label="Education attachment"
            helperText="Upload degree transcript or education proof"
            accept=".pdf,image/*"
            allowedDescription="PDF or image only. Maximum file size is 1 MB."
            onSelect={(file) => setUploadFile("educationDoc", file)}
            progress={uploads.educationDoc.progress}
            fileName={uploads.educationDoc.file?.name ?? null}
          />
        </Stack>
      );
    case 4:
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField select fullWidth label="Do you have work experience?" {...bind("hasExperience")}>
              <MenuItem value="no">No experience yet</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth disabled={form.hasExperience !== "yes"} label="Most recent company" {...bind("experienceCompany")} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth disabled={form.hasExperience !== "yes"} label="Job title" {...bind("experienceTitle")} /></Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth label="Skills (comma separated, optional)" {...bind("skillsCsv")} /></Grid>
        </Grid>
      );
    case 5:
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth label="HSK level" {...bind("hskLevel")}>
              <MenuItem value="0">No HSK yet</MenuItem>
              {hskOptions.map((item) => (
                item === "0" ? null : <MenuItem key={item} value={item}>{`HSK ${item}`}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField select fullWidth label="English test" {...bind("englishType")}>
            <MenuItem value="">No English test yet</MenuItem>
            {englishTestOptions.map((item) => (
              <MenuItem key={item} value={item}>{item}</MenuItem>
            ))}
          </TextField></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth disabled={!form.englishType} label="Overall score" type="number" {...bind("englishScore")} /></Grid>
        </Grid>
      );
    case 6:
      return (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Passport number" {...bind("passportNumber")} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Passport validity" type="date" InputLabelProps={{ shrink: true }} {...bind("passportExpiry")} /></Grid>
          </Grid>
          <UploadDropzone label="Passport" accept=".pdf,image/*" allowedDescription="PDF or image only. Maximum file size is 1 MB." onSelect={(file) => setUploadFile("passport", file)} progress={uploads.passport.progress} fileName={uploads.passport.file?.name ?? null} />
          <UploadDropzone label="CV / Resume" accept=".pdf,image/*" allowedDescription="PDF or image only. Maximum file size is 1 MB." onSelect={(file) => setUploadFile("cv", file)} progress={uploads.cv.progress} fileName={uploads.cv.file?.name ?? null} />
          <UploadDropzone label="Cover letter file (optional)" accept=".pdf,image/*" allowedDescription="PDF or image only. Maximum file size is 1 MB." onSelect={(file) => setUploadFile("coverLetter", file)} progress={uploads.coverLetter.progress} fileName={uploads.coverLetter.file?.name ?? null} />
          <TextField fullWidth multiline minRows={4} label="Cover letter text (optional)" {...bind("coverLetterText")} />
          <UploadDropzone label="Certificate (optional)" accept=".pdf,image/*" allowedDescription="PDF or image only. Maximum file size is 1 MB." onSelect={(file) => setUploadFile("certificate", file)} progress={uploads.certificate.progress} fileName={uploads.certificate.file?.name ?? null} />
        </Stack>
      );
    default:
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}><TextField fullWidth label="Desired roles (comma separated)" {...bind("desiredRoles")} /></Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth label="Desired cities (comma separated)" {...bind("desiredCities")} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Salary expectation (CNY)" type="number" {...bind("salaryExpectation")} /></Grid>
        </Grid>
      );
  }
}
