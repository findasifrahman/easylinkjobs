"use client";

import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { trackEvent } from "@/components/tracking/TrackingProvider";
import { applyToJob, getAccessToken } from "@/lib/api";

export function JobApplyPanel({ jobId, locale }: { jobId: string; locale: string }) {
  const router = useRouter();
  const [coverLetter, setCoverLetter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void trackEvent("view_job", { jobId, source: "job_detail" });
  }, [jobId]);

  return (
    <Stack spacing={2}>
      <Chip label="Apply with profile snapshot" color="primary" variant="outlined" sx={{ alignSelf: "flex-start" }} />
      <Typography variant="h5">Quick apply</Typography>
      <Typography variant="body2" color="text.secondary">
        Your current profile summary is attached to the application. Recruiters only see direct contact details when their company has the right entitlement.
      </Typography>
      <TextField
        label="Cover letter"
        multiline
        minRows={5}
        value={coverLetter}
        onChange={(event) => setCoverLetter(event.target.value)}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
      <Button
        variant="contained"
        disabled={loading}
        onClick={async () => {
          setError(null);
          setSuccess(null);
          if (!getAccessToken()) {
            router.push(`/${locale}/login`);
            return;
          }
          setLoading(true);
          try {
            await applyToJob({
              job_id: jobId,
              cover_letter: coverLetter || undefined
            });
            await trackEvent("apply", { jobId, source: "job_detail" });
            setSuccess("Application submitted.");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Application failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        Apply now
      </Button>
      <Button component={Link} href={`/${locale}/signup`} variant="text" startIcon={<LockRounded />}>
        Need an account? Complete your profile first
      </Button>
      <Stack direction="row" spacing={1} alignItems="center">
        <CheckCircleRounded color="primary" fontSize="small" />
        <Typography variant="caption" color="text.secondary">
          Page views and apply intent are tracked for recruiter analytics.
        </Typography>
      </Stack>
    </Stack>
  );
}
