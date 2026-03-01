"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { changePassword, deleteOpenAIKey } from "@/lib/api";
import { themeTokens } from "@/theme";

export function CandidateSettingsPanel() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ current_password: "", new_password: "" });

  async function handleChangePassword() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await changePassword(form);
      setForm({ current_password: "", new_password: "" });
      setSuccess("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteKey() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteOpenAIKey();
      setSuccess("Stored OpenAI API key deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete stored key.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
      <Card>
        <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
          <Stack spacing={1.5}>
            <Typography variant="h5">Change password</Typography>
            <TextField size="small" type="password" label="Current password" value={form.current_password} onChange={(event) => setForm((current) => ({ ...current, current_password: event.target.value }))} />
            <TextField size="small" type="password" label="New password" value={form.new_password} onChange={(event) => setForm((current) => ({ ...current, new_password: event.target.value }))} />
            <Button variant="contained" disabled={saving} onClick={() => void handleChangePassword()}>Update password</Button>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
          <Stack spacing={1.5}>
            <Typography variant="h5">AI key controls</Typography>
            <Typography variant="body2" color="text.secondary">
              Email change can be added later. Right now you can remove the stored OpenAI key from your account immediately.
            </Typography>
            <Button variant="outlined" color="error" disabled={saving} onClick={() => void handleDeleteKey()}>Delete stored OpenAI API key</Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
