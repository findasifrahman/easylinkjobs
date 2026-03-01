"use client";

import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { GridColDef } from "@mui/x-data-grid";
import { useEffect, useState } from "react";

import { AdminDataGridTable } from "@/components/admin/AdminDataGridTable";
import { createAdminCompany, fetchAdminCompanies, updateAdminCompany, verifyAdminCompany } from "@/lib/api";
import { themeTokens } from "@/theme";

export function AdminCompaniesSection() {
  const [pager, setPager] = useState({ page: 0, pageSize: 10 });
  const [data, setData] = useState<{ items: Array<Record<string, unknown>>; total: number }>({ items: [], total: 0 });
  const [edit, setEdit] = useState<{ id: string; name: string; slug: string; city: string; country: string; verification_status: string } | null>(null);
  const load = () => fetchAdminCompanies({ page: pager.page + 1, pageSize: pager.pageSize }).then((r) => setData({ items: r.items, total: r.total }));
  useEffect(() => { void load(); }, [pager]);
  const columns: GridColDef[] = [
    { field: "name", headerName: "Company", flex: 1, minWidth: 220 },
    { field: "verificationStatus", headerName: "Verification", minWidth: 140 },
    { field: "city", headerName: "City", minWidth: 140 },
    { field: "actions", headerName: "Actions", minWidth: 220, sortable: false, renderCell: (p) => <Stack direction="row" spacing={1}><Button size="small" onClick={() => setEdit({ id: String(p.row.id), name: String(p.row.name ?? ""), slug: String(p.row.slug ?? ""), city: String(p.row.city ?? ""), country: String(p.row.country ?? "China"), verification_status: String(p.row.verificationStatus ?? "UNVERIFIED") })}>Edit</Button><Button size="small" onClick={async () => { await verifyAdminCompany(String(p.row.id)); await load(); }}>Verify</Button></Stack> },
  ];
  return <><Card><CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}><Stack spacing={2}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}><div><Typography variant="h2">Companies</Typography><Typography color="text.secondary">Verification and moderation queue.</Typography></div><Button variant="contained" onClick={async () => { const stamp = Date.now(); await createAdminCompany({ name: `Imported Company ${stamp}`, slug: `imported-company-${stamp}`, company_type: "OTHER", org_size: "SMALL", city: "Shanghai", country: "China" }); await load(); }}>Create company</Button></Stack><AdminDataGridTable rows={data.items} rowCount={data.total} columns={columns} model={pager} onChange={(m) => setPager({ page: m.page, pageSize: m.pageSize })} /></Stack></CardContent></Card><Dialog open={Boolean(edit)} onClose={() => setEdit(null)} fullWidth maxWidth="sm"><DialogTitle>Edit company</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}><TextField label="Name" value={edit?.name ?? ""} onChange={(e) => setEdit((c) => c ? { ...c, name: e.target.value } : c)} /><TextField label="Slug" value={edit?.slug ?? ""} onChange={(e) => setEdit((c) => c ? { ...c, slug: e.target.value } : c)} /><TextField label="City" value={edit?.city ?? ""} onChange={(e) => setEdit((c) => c ? { ...c, city: e.target.value } : c)} /><TextField label="Country" value={edit?.country ?? ""} onChange={(e) => setEdit((c) => c ? { ...c, country: e.target.value } : c)} /><TextField select label="Verification" value={edit?.verification_status ?? "UNVERIFIED"} onChange={(e) => setEdit((c) => c ? { ...c, verification_status: e.target.value } : c)}><MenuItem value="UNVERIFIED">UNVERIFIED</MenuItem><MenuItem value="PENDING">PENDING</MenuItem><MenuItem value="VERIFIED">VERIFIED</MenuItem><MenuItem value="REJECTED">REJECTED</MenuItem></TextField></Stack></DialogContent><DialogActions><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="contained" onClick={async () => { if (!edit) return; await updateAdminCompany(edit.id, { name: edit.name, slug: edit.slug, company_type: "OTHER", org_size: "SMALL", city: edit.city, country: edit.country, verification_status: edit.verification_status }); setEdit(null); await load(); }}>Save</Button></DialogActions></Dialog></>;
}
