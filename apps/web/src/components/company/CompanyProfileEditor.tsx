"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid2";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

import { useAuthSession } from "@/hooks/useAuthSession";
import { fetchCompanyProfile, updateCompanyProfile } from "@/lib/api";
import { themeTokens } from "@/theme";

const companyTypes = ["CHINESE", "WFOE", "RO", "FOREIGN_STARTUP", "AGENCY", "OTHER"];
const orgSizes = ["SOLO", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"];

export function CompanyProfileEditor() {
  const { user } = useAuthSession();
  const companyId = (user?.primary_company?.id as string | undefined) ?? "";
  const [form, setForm] = useState({
    name: "",
    slug: "",
    contact_name: "",
    contact_designation: "",
    contact_email: "",
    contact_phone: "",
    address_line_1: "",
    business_license_no: "",
    company_type: "OTHER",
    org_size: "SMALL",
    website: "",
    description: "",
    city: "",
    province: "",
    country: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      return;
    }
    setLoading(true);
    setError(null);
    void fetchCompanyProfile(companyId)
      .then((company) => {
        setForm({
          name: String(company.name ?? ""),
          slug: String(company.slug ?? ""),
          contact_name: String(company.contact_name ?? company.contactName ?? ""),
          contact_designation: String(company.contact_designation ?? company.contactDesignation ?? ""),
          contact_email: String(company.contact_email ?? company.contactEmail ?? ""),
          contact_phone: String(company.contact_phone ?? company.contactPhone ?? ""),
          address_line_1: String(company.address_line_1 ?? company.addressLine1 ?? ""),
          business_license_no: String(company.business_license_no ?? company.businessLicenseNo ?? ""),
          company_type: String(company.company_type ?? company.companyType ?? "OTHER"),
          org_size: String(company.org_size ?? company.orgSize ?? "SMALL"),
          website: String(company.website ?? ""),
          description: String(company.description ?? ""),
          city: String(company.city ?? ""),
          province: String(company.province ?? ""),
          country: String(company.country ?? ""),
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load company profile.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [companyId]);

  if (!companyId) {
    return <Alert severity="info">No active company membership found.</Alert>;
  }

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <Card sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: { xs: themeTokens.layout.cardPadding.regular, md: themeTokens.layout.cardPadding.spacious } }}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="h4">Company profile</Typography>
            <Typography variant="body2" color="text.secondary">
              Update the employer identity, recruiter contact, and business profile immediately after signup.
            </Typography>
          </Stack>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" fullWidth label="Company name" value={form.name} onChange={(event) => update("name", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" fullWidth label="Slug" value={form.slug} onChange={(event) => update("slug", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" fullWidth label="Contact person" value={form.contact_name} onChange={(event) => update("contact_name", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" fullWidth label="Designation" value={form.contact_designation} onChange={(event) => update("contact_designation", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" fullWidth label="Contact email" value={form.contact_email} onChange={(event) => update("contact_email", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" fullWidth label="Contact phone" value={form.contact_phone} onChange={(event) => update("contact_phone", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField size="small" fullWidth label="Business address" value={form.address_line_1} onChange={(event) => update("address_line_1", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" fullWidth label="Business license no." value={form.business_license_no} onChange={(event) => update("business_license_no", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" fullWidth label="Website" value={form.website} onChange={(event) => update("website", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" select fullWidth label="Company type" value={form.company_type} onChange={(event) => update("company_type", event.target.value)}>
                {companyTypes.map((item) => (
                  <MenuItem key={item} value={item}>{item}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField size="small" select fullWidth label="Org size" value={form.org_size} onChange={(event) => update("org_size", event.target.value)}>
                {orgSizes.map((item) => (
                  <MenuItem key={item} value={item}>{item}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField size="small" fullWidth label="City" value={form.city} onChange={(event) => update("city", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField size="small" fullWidth label="Province" value={form.province} onChange={(event) => update("province", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField size="small" fullWidth label="Country" value={form.country} onChange={(event) => update("country", event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField size="small" fullWidth multiline minRows={3} label="Description" value={form.description} onChange={(event) => update("description", event.target.value)} />
            </Grid>
          </Grid>
          <Button
            variant="contained"
            disabled={loading || saving || !form.name || !form.slug}
            onClick={async () => {
              setSaving(true);
              setError(null);
              setSuccess(null);
              try {
                await updateCompanyProfile(companyId, form);
                setSuccess("Company profile updated.");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to update company profile.");
              } finally {
                setSaving(false);
              }
            }}
          >
            Save company profile
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
