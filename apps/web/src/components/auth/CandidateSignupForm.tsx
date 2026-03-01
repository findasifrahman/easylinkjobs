"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthActionButton } from "@/components/home/AuthActionButton";
import { useAuthSession } from "@/hooks/useAuthSession";
import { fetchCurrentUser, setAuthTokens, signupCandidate } from "@/lib/api";

export function CandidateSignupForm({ locale }: { locale: string }) {
  const router = useRouter();
  const { setSession } = useAuthSession();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Stack spacing={2.25}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
      <TextField
        size="small"
        label="Full name"
        fullWidth
        value={form.full_name}
        onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
      />
      <TextField
        size="small"
        label="Email"
        type="email"
        fullWidth
        value={form.email}
        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
      />
      <TextField
        size="small"
        label="Phone"
        fullWidth
        value={form.phone}
        onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
      />
      <TextField
        size="small"
        label="Password"
        type="password"
        fullWidth
        value={form.password}
        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
      />
      <TextField
        size="small"
        label="Retype password"
        type="password"
        fullWidth
        value={form.confirm_password}
        onChange={(event) => setForm((current) => ({ ...current, confirm_password: event.target.value }))}
      />
      <AuthActionButton
        eventName="signup"
        variant="contained"
        disabled={loading}
        onClick={async () => {
          setError(null);
          setSuccess(null);
          if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
            setError("Full name, email, and phone are required.");
            return;
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            setError("Enter a valid email address.");
            return;
          }
          if (form.password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
          }
          if (form.password !== form.confirm_password) {
            setError("Passwords do not match.");
            return;
          }
          setLoading(true);
          try {
            const result = await signupCandidate({
              full_name: form.full_name,
              email: form.email,
              phone: form.phone,
              password: form.password,
            });
            setAuthTokens(result.access_token, result.refresh_token);
            try {
              const session = await fetchCurrentUser();
              setSession(session);
            } catch {
              // Route can still continue; provider will re-resolve from stored tokens.
            }
            setSuccess("Candidate account created. Redirecting to your profile setup...");
            if (typeof window !== "undefined") {
              window.location.assign(`/${locale}/dashboard/candidate/profile`);
              return;
            }
            router.replace(`/${locale}/dashboard/candidate/profile`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Signup failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Creating account..." : "Create candidate account"}
      </AuthActionButton>
      <Typography variant="body2" color="text.secondary">
        Your detailed education, China history, documents, and preferences are completed after signup in your profile flow.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Hiring for a company? <Link href={`/${locale}/signup/company`}>Create an employer account</Link>
      </Typography>
    </Stack>
  );
}
