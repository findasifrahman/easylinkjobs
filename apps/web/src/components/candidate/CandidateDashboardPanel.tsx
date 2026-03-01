"use client";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid2";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AiCvCard } from "@/components/candidate/AiCvCard";
import { UploadDropzone } from "@/components/candidate/UploadDropzone";
import { useAuthSession } from "@/hooks/useAuthSession";
import { fetchCandidateProfile, fetchMyApplications, getSignedMediaUrl, uploadCandidateProfilePhoto } from "@/lib/api";
import { themeTokens } from "@/theme";

type DashboardState = {
  completion_score: number;
  profile: Record<string, unknown>;
  education: Array<Record<string, unknown>>;
  experience: Array<Record<string, unknown>>;
  skills: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  languages: Array<Record<string, unknown>>;
  certifications: Array<Record<string, unknown>>;
} | null;

export function CandidateDashboardPanel() {
  const { user } = useAuthSession();
  const pathname = usePathname();
  const [data, setData] = useState<DashboardState>(null);
  const [applications, setApplications] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  useEffect(() => {
    fetchCandidateProfile()
      .then(async (payload) => {
        setData(payload);
        const profile = payload.profile as Record<string, unknown>;
        const extensibleData =
          typeof profile.extensibleData === "object" && profile.extensibleData !== null
            ? (profile.extensibleData as Record<string, unknown>)
            : {};
        const profileImageAssetId = typeof extensibleData.profile_image_asset_id === "string" ? extensibleData.profile_image_asset_id : null;
        if (profileImageAssetId) {
          try {
            const signed = await getSignedMediaUrl(profileImageAssetId);
            setPhotoUrl(signed.url);
          } catch {
            setPhotoUrl(null);
          }
        } else {
          setPhotoUrl(null);
        }
      })
      .catch(() => {
        setError("Complete signup and the wizard to unlock candidate data.");
      });
    fetchMyApplications().then(setApplications).catch(() => setApplications([]));
  }, []);

  const actions = useMemo(() => {
    if (!data) {
      return ["Create your account", "Complete personal details", "Upload passport and CV"];
    }
    const items: string[] = [];
    if (data.completion_score < 100) {
      items.push("Finish the remaining wizard steps.");
    }
    if (data.documents.length < 2) {
      items.push("Upload your passport and CV.");
    }
    if (data.skills.length < 3) {
      items.push("Add more skills to improve recruiter matching.");
    }
    if (data.languages.length < 1) {
      items.push("Add language proofs beyond your HSK and English score.");
    }
    return items.length > 0 ? items : ["Your profile is strong. Start applying to priority roles."];
  }, [data]);

  const basePath = pathname?.replace(/\/$/, "") ?? "";

  return (
    <Stack spacing={2}>
      <Typography variant="h2">Candidate dashboard</Typography>
      {user ? (
        <Card>
          <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Avatar src={photoUrl ?? undefined} sx={{ width: 44, height: 44, bgcolor: "rgba(17,205,222,0.14)", color: "primary.main", fontWeight: 800 }}>
                  {user.display_name.slice(0, 1).toUpperCase()}
                </Avatar>
                <Stack spacing={0.25}>
                  <Typography variant="h5">{user.display_name}</Typography>
                  <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                </Stack>
              </Stack>
              <Alert severity="success" icon={false} sx={{ py: 0 }}>
                Candidate
              </Alert>
            </Stack>
          </CardContent>
        </Card>
      ) : null}
      {error ? <Alert severity="info">{error}</Alert> : null}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: themeTokens.layout.cardPadding.regular, height: "100%" }}>
              <Stack spacing={1.25} sx={{ height: "100%", justifyContent: "space-between" }}>
                <Stack spacing={1.25}>
                <Typography variant="h5">Profile completeness</Typography>
                <LinearProgress variant="determinate" value={data?.completion_score ?? 18} />
                <Typography variant="body2" color="text.secondary">
                  {data?.completion_score ?? 18}% complete
                </Typography>
                </Stack>
                <Button component={Link} href={`${basePath}/profile`} variant="contained" size="small">
                  Complete profile
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: themeTokens.layout.cardPadding.regular, height: "100%" }}>
              <Stack spacing={1.25} sx={{ height: "100%", justifyContent: "space-between" }}>
                <Stack spacing={1.25}>
                <Typography variant="h5">Profile photo</Typography>
                {photoPreviewUrl || photoUrl ? (
                  <Stack spacing={0.75}>
                    <Typography variant="caption" color="text.secondary">
                      Preview uses a centered square crop.
                    </Typography>
                    <Avatar
                      src={photoPreviewUrl ?? photoUrl ?? undefined}
                      variant="rounded"
                      sx={{
                        width: 96,
                        height: 96,
                        borderRadius: 2,
                        bgcolor: "rgba(17,205,222,0.08)",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                  </Stack>
                ) : null}
                <UploadDropzone
                  label="Upload profile photo"
                  helperText="Add a passport-size photo without finishing the full profile."
                  accept="image/*"
                  allowedDescription="Image only. Maximum file size is 1 MB."
                  onSelect={(file) => setPhotoFile(file)}
                  fileName={photoFile?.name ?? null}
                />
                </Stack>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!photoFile || photoUploading}
                  onClick={async () => {
                    if (!photoFile) {
                      return;
                    }
                    setPhotoUploading(true);
                    setError(null);
                    try {
                      const response = await uploadCandidateProfilePhoto(photoFile);
                      const profile = response.profile as Record<string, unknown>;
                      const extensibleData =
                        typeof profile.extensibleData === "object" && profile.extensibleData !== null
                          ? (profile.extensibleData as Record<string, unknown>)
                          : {};
                      const profileImageAssetId =
                        typeof extensibleData.profile_image_asset_id === "string" ? extensibleData.profile_image_asset_id : null;
                      if (profileImageAssetId) {
                        const signed = await getSignedMediaUrl(profileImageAssetId);
                        setPhotoUrl(signed.url);
                      }
                      setPhotoFile(null);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Profile photo upload failed.");
                    } finally {
                      setPhotoUploading(false);
                    }
                  }}
                >
                  {photoUploading ? "Uploading..." : "Save photo"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: themeTokens.layout.cardPadding.regular, height: "100%" }}>
              <Stack spacing={1.25} sx={{ height: "100%", justifyContent: "space-between" }}>
                <Stack spacing={1.25}>
                <Typography variant="h5">Documents</Typography>
                <Typography variant="h3">{data?.documents.length ?? 0}</Typography>
                </Stack>
                <Button component={Link} href={`${basePath}/documents`} variant="outlined" size="small">
                  Upload documents
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: themeTokens.layout.cardPadding.regular, height: "100%" }}>
              <Stack spacing={1.25} sx={{ height: "100%", justifyContent: "space-between" }}>
                <Stack spacing={1.25}>
                <Typography variant="h5">Applications</Typography>
                <Typography variant="h3">{applications.length}</Typography>
                </Stack>
                <Button href="#applications" component="a" variant="outlined" size="small">
                  My applications
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
              <Stack spacing={1}>
                <Typography variant="h5">Recommended next actions</Typography>
                {actions.map((action) => (
                  <Typography key={action} variant="body2" color="text.secondary">
                    • {action}
                  </Typography>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 7.2 }}>
          <Card id="applications">
            <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
              <Stack spacing={1.25}>
                <Typography variant="h5">My applications</Typography>
                {applications.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No applications yet. Apply to public jobs to start your pipeline.</Typography>
                ) : (
                  applications.slice(0, 6).map((item) => (
                    <Card key={String(item.id)} variant="outlined">
                      <CardContent sx={{ p: 1.5 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={0.75}>
                          <div>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {String(((item.job as Record<string, unknown> | null)?.title) ?? "Applied role")}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {String(((item.company as Record<string, unknown> | null)?.name) ?? "Employer")} • {String(item.status ?? "APPLIED")}
                            </Typography>
                          </div>
                          <Typography variant="caption" color="text.secondary">
                            {String(item.created_at ?? "").slice(0, 10)}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4.8 }}>
          <Card>
            <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
              <Stack spacing={1.25}>
                <Typography variant="h5">Notifications</Typography>
                {[
                  "Complete passport details for stronger recruiter trust.",
                  "Add one more certification to improve profile score.",
                  "Check your latest application statuses this week.",
                ].map((item) => (
                  <Alert key={item} severity="info" icon={false} sx={{ py: 0 }}>
                    {item}
                  </Alert>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <AiCvCard />
        </Grid>
      </Grid>
    </Stack>
  );
}
