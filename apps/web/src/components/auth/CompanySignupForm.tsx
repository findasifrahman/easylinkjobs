"use client";

import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid2";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthActionButton } from "@/components/home/AuthActionButton";
import { useAuthSession } from "@/hooks/useAuthSession";
import { fetchCurrentUser, setAuthTokens, signupCompany } from "@/lib/api";

const companyTypes = ["CHINESE", "WFOE", "RO", "FOREIGN_STARTUP", "AGENCY", "OTHER"];
const orgSizes = ["SOLO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"];

export function CompanySignupForm({ locale }: { locale: string }) {
  const router = useRouter();
  const { setSession } = useAuthSession();
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    contact_designation: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    website: "",
    company_type: "OTHER",
    org_size: "SMALL",
    address_line_1: "",
    city: "",
    province: "",
    country: "China",
    business_license_no: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <Stack spacing={2.25}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField size="small" fullWidth label="Company name" value={form.company_name} onChange={(event) => update("company_name", event.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField size="small" fullWidth label="Contact person" value={form.contact_name} onChange={(event) => update("contact_name", event.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField size="small" fullWidth label="Designation" value={form.contact_designation} onChange={(event) => update("contact_designation", event.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField size="small" fullWidth label="Business email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField size="small" fullWidth label="Phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField size="small" fullWidth label="Website (optional)" value={form.website} onChange={(event) => update("website", event.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField size="small" select fullWidth label="Company type" value={form.company_type} onChange={(event) => update("company_type", event.target.value)}>
            {companyTypes.map((item) => (
              <MenuItem key={item} value={item}>{item}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField size="small" select fullWidth label="Organization size" value={form.org_size} onChange={(event) => update("org_size", event.target.value)}>
            {orgSizes.map((item) => (
              <MenuItem key={item} value={item}>{item}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField size="small" fullWidth label="Business address" value={form.address_line_1} onChange={(event) => update("address_line_1", event.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField size="small" fullWidth label="City" value={form.city} onChange={(event) => update("city", event.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField size="small" fullWidth label="Province / State" value={form.province} onChange={(event) => update("province", event.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField size="small" fullWidth label="Country" value={form.country} onChange={(event) => update("country", event.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField size="small" fullWidth label="Business license no. (optional)" value={form.business_license_no} onChange={(event) => update("business_license_no", event.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField size="small" fullWidth label="Password" type="password" value={form.password} onChange={(event) => update("password", event.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField size="small" fullWidth label="Retype password" type="password" value={form.confirm_password} onChange={(event) => update("confirm_password", event.target.value)} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField size="small" fullWidth multiline minRows={3} label="Company overview (optional)" value={form.description} onChange={(event) => update("description", event.target.value)} />
        </Grid>
      </Grid>
      <AuthActionButton
        eventName="signup"
        variant="contained"
        disabled={loading}
        onClick={async () => {
          setError(null);
          setSuccess(null);
          const required = [
            form.company_name,
            form.contact_name,
            form.contact_designation,
            form.email,
            form.phone,
            form.address_line_1,
            form.city,
            form.country,
          ];
          if (required.some((item) => !item.trim())) {
            setError("Complete the required company and contact fields.");
            return;
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            setError("Enter a valid business email address.");
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
            const result = await signupCompany({
              company_name: form.company_name,
              contact_name: form.contact_name,
              contact_designation: form.contact_designation,
              email: form.email,
              phone: form.phone,
              password: form.password,
              website: form.website || null,
              company_type: form.company_type,
              org_size: form.org_size,
              address_line_1: form.address_line_1,
              city: form.city,
              province: form.province || null,
              country: form.country,
              business_license_no: form.business_license_no || null,
              description: form.description || null,
            });
            setAuthTokens(result.access_token, result.refresh_token);
            try {
              const session = await fetchCurrentUser();
              setSession(session);
            } catch {
              // Route can still continue; provider will re-resolve from stored tokens.
            }
            setSuccess("Employer account created. Redirecting to company profile setup...");
            if (typeof window !== "undefined") {
              window.location.assign(`/${locale}/dashboard/company/profile`);
              return;
            }
            router.replace(`/${locale}/dashboard/company/profile`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Employer signup failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Creating employer account..." : "Create employer account"}
      </AuthActionButton>
      <Typography variant="body2" color="text.secondary">
        Company accounts are created in pending verification state. Super admins can approve the company before it is treated as verified.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Looking for work? <Link href={`/${locale}/signup/candidate`}>Create a candidate account</Link>
      </Typography>
    </Stack>
  );
}
