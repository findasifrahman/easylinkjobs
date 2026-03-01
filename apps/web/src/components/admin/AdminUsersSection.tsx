"use client";

import Alert from "@mui/material/Alert";
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
import { createAdminUser, deleteAdminUser, fetchAdminUsers, updateAdminUser } from "@/lib/api";
import { themeTokens } from "@/theme";

type EditState = { id: string; email: string; status: string; role_key: string } | null;

type PasswordState = { password: string; confirm_password: string };

const initialCreateForm = {
  email: "",
  status: "ACTIVE",
  role_key: "super_admin",
  password: "",
  confirm_password: "",
};

const initialPasswordState: PasswordState = { password: "", confirm_password: "" };

export function AdminUsersSection() {
  const [pager, setPager] = useState({ page: 0, pageSize: 10 });
  const [data, setData] = useState<{ items: Array<Record<string, unknown>>; total: number }>({ items: [], total: 0 });
  const [edit, setEdit] = useState<EditState>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [editPassword, setEditPassword] = useState<PasswordState>(initialPasswordState);
  const [error, setError] = useState("");

  const load = () =>
    fetchAdminUsers({ page: pager.page + 1, pageSize: pager.pageSize }).then((r) =>
      setData({ items: r.items, total: r.total })
    );

  useEffect(() => {
    void load();
  }, [pager]);

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateForm(initialCreateForm);
    setError("");
  };

  const closeEdit = () => {
    setEdit(null);
    setEditPassword(initialPasswordState);
    setError("");
  };

  const columns: GridColDef[] = [
    { field: "email", headerName: "Email", flex: 1, minWidth: 240 },
    { field: "status", headerName: "Status", minWidth: 120 },
    {
      field: "role_key",
      headerName: "Global role",
      minWidth: 150,
      valueGetter: (_, row) => String(row.role_key ?? "none"),
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 220,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            onClick={() => {
              setError("");
              setEdit({
                id: String(p.row.id),
                email: String(p.row.email ?? ""),
                status: String(p.row.status ?? "ACTIVE"),
                role_key: String(p.row.role_key ?? "super_admin"),
              });
            }}
          >
            Edit
          </Button>
          <Button
            size="small"
            color="error"
            onClick={async () => {
              await deleteAdminUser(String(p.row.id));
              await load();
            }}
          >
            Archive
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
              <div>
                <Typography variant="h2">Users</Typography>
                <Typography color="text.secondary">
                  Server-side paginated user management. You can create global super admin users here.
                </Typography>
              </div>
              <Button
                variant="contained"
                onClick={() => {
                  setError("");
                  setCreateOpen(true);
                }}
              >
                Create user
              </Button>
            </Stack>
            <AdminDataGridTable
              rows={data.items}
              rowCount={data.total}
              columns={columns}
              model={pager}
              onChange={(m) => setPager({ page: m.page, pageSize: m.pageSize })}
            />
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onClose={closeCreate} fullWidth maxWidth="sm">
        <DialogTitle>Create user</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((c) => ({ ...c, email: e.target.value }))}
            />
            <TextField
              label="Password"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((c) => ({ ...c, password: e.target.value }))}
              helperText="At least 8 characters, with uppercase, lowercase, and a number."
            />
            <TextField
              label="Retype password"
              type="password"
              value={createForm.confirm_password}
              onChange={(e) => setCreateForm((c) => ({ ...c, confirm_password: e.target.value }))}
            />
            <TextField
              select
              label="Status"
              value={createForm.status}
              onChange={(e) => setCreateForm((c) => ({ ...c, status: e.target.value }))}
            >
              <MenuItem value="ACTIVE">ACTIVE</MenuItem>
              <MenuItem value="INVITED">INVITED</MenuItem>
              <MenuItem value="SUSPENDED">SUSPENDED</MenuItem>
              <MenuItem value="DISABLED">DISABLED</MenuItem>
            </TextField>
            <TextField
              select
              label="Global role"
              value={createForm.role_key}
              onChange={(e) => setCreateForm((c) => ({ ...c, role_key: e.target.value }))}
            >
              <MenuItem value="super_admin">Super Admin</MenuItem>
              <MenuItem value="job_seeker">Candidate</MenuItem>
              <MenuItem value="job_admin">Recruiter</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreate}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!createForm.password || !createForm.confirm_password) {
                setError("Password and retype password are required.");
                return;
              }
              if (createForm.password !== createForm.confirm_password) {
                setError("Passwords do not match.");
                return;
              }
              try {
                await createAdminUser({
                  email: createForm.email,
                  password_hash: createForm.password,
                  status: createForm.status,
                  role_key: createForm.role_key,
                });
                closeCreate();
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to create user.");
              }
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(edit)} onClose={closeEdit} fullWidth maxWidth="sm">
        <DialogTitle>Edit user</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label="Email"
              value={edit?.email ?? ""}
              onChange={(e) => setEdit((c) => (c ? { ...c, email: e.target.value } : c))}
            />
            <TextField
              label="New password (optional)"
              type="password"
              value={editPassword.password}
              onChange={(e) => setEditPassword((c) => ({ ...c, password: e.target.value }))}
              helperText="Leave blank to keep the current password."
            />
            <TextField
              label="Retype new password"
              type="password"
              value={editPassword.confirm_password}
              onChange={(e) => setEditPassword((c) => ({ ...c, confirm_password: e.target.value }))}
            />
            <TextField
              select
              label="Status"
              value={edit?.status ?? "ACTIVE"}
              onChange={(e) => setEdit((c) => (c ? { ...c, status: e.target.value } : c))}
            >
              <MenuItem value="ACTIVE">ACTIVE</MenuItem>
              <MenuItem value="INVITED">INVITED</MenuItem>
              <MenuItem value="SUSPENDED">SUSPENDED</MenuItem>
              <MenuItem value="DISABLED">DISABLED</MenuItem>
            </TextField>
            <TextField
              select
              label="Global role"
              value={edit?.role_key ?? "super_admin"}
              onChange={(e) => setEdit((c) => (c ? { ...c, role_key: e.target.value } : c))}
            >
              <MenuItem value="super_admin">Super Admin</MenuItem>
              <MenuItem value="job_seeker">Candidate</MenuItem>
              <MenuItem value="job_admin">Recruiter</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!edit) return;
              if (editPassword.password || editPassword.confirm_password) {
                if (!editPassword.password) {
                  setError("Enter the new password before saving.");
                  return;
                }
                if (editPassword.password !== editPassword.confirm_password) {
                  setError("Passwords do not match.");
                  return;
                }
              }
              try {
                await updateAdminUser(edit.id, {
                  email: edit.email,
                  password_hash: editPassword.password || undefined,
                  status: edit.status,
                  role_key: edit.role_key,
                });
                closeEdit();
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to update user.");
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
