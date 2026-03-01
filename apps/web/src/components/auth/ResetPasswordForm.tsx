"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthActionButton } from "@/components/home/AuthActionButton";
import { resetPassword } from "@/lib/api";

export function ResetPasswordForm({ locale, token }: { locale: string; token: string }) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Stack spacing={2.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
      <TextField
        label="New password"
        type="password"
        fullWidth
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
      />
      <TextField
        label="Confirm new password"
        type="password"
        fullWidth
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />
      <AuthActionButton
        eventName="reset_password"
        variant="contained"
        disabled={loading || !token}
        onClick={async () => {
          setError(null);
          setSuccess(null);
          if (!token) {
            setError("Missing reset token.");
            return;
          }
          if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
          }
          setLoading(true);
          try {
            await resetPassword({ token, new_password: newPassword });
            setSuccess("Password reset. Redirecting to login...");
            window.setTimeout(() => {
              router.push(`/${locale}/login`);
            }, 900);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Reset failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        Reset password
      </AuthActionButton>
      <Typography variant="body2" color="text.secondary">
        Password must be at least 8 characters and include uppercase, lowercase, and a number.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <Link href={`/${locale}/login`}>Back to login</Link>
      </Typography>
    </Stack>
  );
}
