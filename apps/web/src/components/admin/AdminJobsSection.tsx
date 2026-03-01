"use client";

import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { GridColDef } from "@mui/x-data-grid";
import { useEffect, useState } from "react";

import { AdminDataGridTable } from "@/components/admin/AdminDataGridTable";
import { approveAdminJob, createAdminJob, fetchAdminCompanies, fetchAdminJobs, rejectAdminJob, updateAdminJob } from "@/lib/api";
import { themeTokens } from "@/theme";

export function AdminJobsSection() {
  const [pager, setPager] = useState({ page: 0, pageSize: 10 });
  const [data, setData] = useState<{ items: Array<Record<string, unknown>>; total: number }>({ items: [], total: 0 });
  const [companies, setCompanies] = useState<Array<Record<string, unknown>>>([]);
  const [edit, setEdit] = useState<{ id: string; company_id: string; title: string; description: string; city: string; country: string; is_published: boolean } | null>(null);
  const load = () => fetchAdminJobs({ page: pager.page + 1, pageSize: pager.pageSize }).then((r) => setData({ items: r.items, total: r.total }));
  useEffect(() => { fetchAdminCompanies({ page: 1, pageSize: 20 }).then((r) => setCompanies(r.items)).catch(() => setCompanies([])); }, []);
  useEffect(() => { void load(); }, [pager]);
  const columns: GridColDef[] = [
    { field: "title", headerName: "Job", flex: 1, minWidth: 240 },
    { field: "source", headerName: "Source", minWidth: 120 },
    { field: "city", headerName: "City", minWidth: 140 },
    {
      field: "moderation",
      headerName: "Moderation",
      minWidth: 190,
      valueGetter: (_, row) => (row.isPublished ? "Approved / live" : "Pending or rejected"),
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 320,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.75}>
          <Button
            size="small"
            onClick={() =>
              setEdit({
                id: String(p.row.id),
                company_id: String(p.row.companyId ?? ""),
                title: String(p.row.title ?? ""),
                description: String(p.row.description ?? ""),
                city: String(p.row.city ?? ""),
                country: String(p.row.country ?? "China"),
                is_published: Boolean(p.row.isPublished),
              })
            }
          >
            Edit
          </Button>
          <Button size="small" color="success" onClick={async () => { await approveAdminJob(String(p.row.id)); await load(); }}>
            Approve
          </Button>
          <Button size="small" color="error" onClick={async () => { await rejectAdminJob(String(p.row.id)); await load(); }}>
            Reject
          </Button>
        </Stack>
      ),
    },
  ];
  return <><Card><CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}><Stack spacing={2}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}><div><Typography variant="h2">Jobs</Typography><Typography color="text.secondary">Paginated moderation for job postings.</Typography></div><Button variant="contained" disabled={!companies[0]} onClick={async () => { if (!companies[0]) return; await createAdminJob({ company_id: String(companies[0].id), title: `Admin Job ${Date.now()}`, description: "Admin-created moderation placeholder.", city: "Shanghai", country: "China", source: "DIRECT", is_published: false }); await load(); }}>Create job</Button></Stack><AdminDataGridTable rows={data.items} rowCount={data.total} columns={columns} model={pager} onChange={(m) => setPager({ page: m.page, pageSize: m.pageSize })} /></Stack></CardContent></Card><Dialog open={Boolean(edit)} onClose={() => setEdit(null)} fullWidth maxWidth="sm"><DialogTitle>Edit job</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}><TextField label="Title" value={edit?.title ?? ""} onChange={(e) => setEdit((c) => c ? { ...c, title: e.target.value } : c)} /><TextField label="Description" multiline minRows={4} value={edit?.description ?? ""} onChange={(e) => setEdit((c) => c ? { ...c, description: e.target.value } : c)} /><TextField label="City" value={edit?.city ?? ""} onChange={(e) => setEdit((c) => c ? { ...c, city: e.target.value } : c)} /><TextField label="Country" value={edit?.country ?? ""} onChange={(e) => setEdit((c) => c ? { ...c, country: e.target.value } : c)} /></Stack></DialogContent><DialogActions><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="contained" onClick={async () => { if (!edit) return; await updateAdminJob(edit.id, { company_id: edit.company_id, title: edit.title, description: edit.description, city: edit.city, country: edit.country, source: "DIRECT", is_published: edit.is_published }); setEdit(null); await load(); }}>Save</Button></DialogActions></Dialog></>;
}
