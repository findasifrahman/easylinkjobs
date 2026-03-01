"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

import { fetchArchiveStatus, runArchiveNow } from "@/lib/api";
import { themeTokens } from "@/theme";

export function AdminArchiveSection() {
  const [form, setForm] = useState({ tracking_days: "90", application_days: "180" });
  const [status, setStatus] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  async function load() { const s = await fetchArchiveStatus(Number(form.tracking_days), Number(form.application_days)); setStatus(s); }
  useEffect(() => { void load(); }, []);
  return <Card><CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}><Stack spacing={2}><Typography variant="h2">Archive control</Typography><Typography color="text.secondary">Manual archive runner for production-safe batching.</Typography>{message ? <Alert severity="success">{message}</Alert> : null}<TextField label="Tracking days" type="number" value={form.tracking_days} onChange={(e) => setForm((c) => ({ ...c, tracking_days: e.target.value }))} /><TextField label="Application days" type="number" value={form.application_days} onChange={(e) => setForm((c) => ({ ...c, application_days: e.target.value }))} /><Typography variant="body2" color="text.secondary">Eligible tracking rows: {Number(status.eligible_tracking_count ?? 0)}</Typography><Typography variant="body2" color="text.secondary">Eligible application rows: {Number(status.eligible_application_count ?? 0)}</Typography><Button variant="contained" onClick={async () => { await runArchiveNow({ tracking_days: Number(form.tracking_days), application_days: Number(form.application_days) }); setMessage("Archive run completed."); await load(); }}>Run archive now</Button></Stack></CardContent></Card>;
}
