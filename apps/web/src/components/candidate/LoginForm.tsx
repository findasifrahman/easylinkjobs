"use client";

import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthActionButton } from "@/components/home/AuthActionButton";
import { useAuthSession } from "@/hooks/useAuthSession";
import { fetchCurrentUser, loginUser, setAuthTokens } from "@/lib/api";

export function LoginForm({ locale }: { locale: string }) {
  const router = useRouter();
  const { setSession } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Stack spacing={2.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
      <TextField label="Email" type="email" fullWidth value={email} onChange={(event) => setEmail(event.target.value)} />
      <TextField
        label="Password"
        type="password"
        fullWidth
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <FormControlLabel
          control={<Checkbox checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />}
          label="Remember me"
        />
        <Typography component={Link} href={`/${locale}/forgot-password`} variant="body2" sx={{ textDecoration: "none" }}>
          Forgot password?
        </Typography>
      </Stack>
      <AuthActionButton
        eventName="login"
        variant="contained"
        disabled={loading}
        onClick={async () => {
          setError(null);
          setSuccess(null);
          if (!email.trim() || !password) {
            setError("Enter both email and password.");
            return;
          }
          setLoading(true);
          try {
            const tokens = await loginUser({ email, password });
            setAuthTokens(tokens.access_token, tokens.refresh_token, { remember: rememberMe });
            setSuccess("Login successful. Redirecting to your dashboard...");
            try {
              const session = await fetchCurrentUser();
              setSession(session);
              const hasAdmin = session.permission_summary.global.includes("admin:access");
              const hasCompany = Object.values(session.permission_summary.by_company).flat().some(
                (permission) => permission === "jobs:create" || permission === "applications:read"
              );
              const target = hasAdmin
                ? "admin"
                : hasCompany
                  ? "company"
                  : "candidate";
              if (typeof window !== "undefined") {
                window.location.assign(`/${locale}/dashboard/${target}`);
                return;
              }
              router.replace(`/${locale}/dashboard/${target}`);
            } catch {
              if (typeof window !== "undefined") {
                window.location.assign(`/${locale}/dashboard`);
                return;
              }
              router.replace(`/${locale}/dashboard`);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Signing in..." : "Login"}
      </AuthActionButton>
      <Typography variant="body2" color="text.secondary">
        {rememberMe
          ? "Tokens are stored across browser restarts and refreshed automatically."
          : "Tokens stay in this browser session only and clear when the tab session ends."}
      </Typography>
    </Stack>
  );
}
