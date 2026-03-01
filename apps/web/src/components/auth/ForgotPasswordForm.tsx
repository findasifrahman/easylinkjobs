"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState } from "react";

import { AuthActionButton } from "@/components/home/AuthActionButton";
import { forgotPassword } from "@/lib/api";

export function ForgotPasswordForm({ locale }: { locale: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Stack spacing={2.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
      <TextField
        label="Email"
        type="email"
        fullWidth
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <AuthActionButton
        eventName="forgot_password"
        variant="contained"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          setSuccess(null);
          try {
            const result = await forgotPassword({ email });
            setSuccess(result.message);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Request failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        Send reset link
      </AuthActionButton>
      <Typography variant="body2" color="text.secondary">
        Email sending is still a placeholder. In development, the reset link is logged by the API server.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Remembered your password? <Link href={`/${locale}/login`}>Back to login</Link>
      </Typography>
    </Stack>
  );
}
