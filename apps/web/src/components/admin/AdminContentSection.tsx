"use client";

import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { GridColDef } from "@mui/x-data-grid";
import { useEffect, useState } from "react";

import { AdminDataGridTable } from "@/components/admin/AdminDataGridTable";
import { createAdminBlogPost, createAdminTutorial, fetchAdminBlogPosts, fetchAdminTutorials } from "@/lib/api";
import { themeTokens } from "@/theme";

export function AdminContentSection() {
  const [blogs, setBlogs] = useState<Array<Record<string, unknown>>>([]);
  const [tutorials, setTutorials] = useState<Array<Record<string, unknown>>>([]);
  const load = async () => {
    const [b, t] = await Promise.all([fetchAdminBlogPosts({ page: 1, pageSize: 10 }), fetchAdminTutorials({ page: 1, pageSize: 10 })]);
    setBlogs(b.items);
    setTutorials(t.items);
  };
  useEffect(() => { void load(); }, []);
  const cols: GridColDef[] = [
    { field: "title", headerName: "Title", flex: 1, minWidth: 220 },
    { field: "slug", headerName: "Slug", minWidth: 180 },
    { field: "isPublished", headerName: "Published", minWidth: 120, valueFormatter: (v) => (v ? "Yes" : "No") },
  ];
  return <Stack spacing={2}><Card><CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}><div><Typography variant="h2">Content</Typography><Typography color="text.secondary">Blog and tutorial publishing split out from core ops.</Typography></div><Stack direction={{ xs: "column", sm: "row" }} spacing={1}><Button variant="contained" onClick={async () => { const stamp = Date.now(); await createAdminBlogPost({ title: `Market Update ${stamp}`, slug: `market-update-${stamp}`, excerpt: "SEO article", content: "## Hiring snapshot", is_published: true }); await load(); }}>Create blog</Button><Button variant="outlined" onClick={async () => { const stamp = Date.now(); await createAdminTutorial({ title: `Visa Guide ${stamp}`, slug: `visa-guide-${stamp}`, summary: "Step by step", content: "## Step-by-step", is_published: true }); await load(); }}>Create tutorial</Button></Stack></Stack></CardContent></Card><Card><CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}><Typography variant="h5" sx={{ mb: 1.5 }}>Blog posts</Typography><AdminDataGridTable rows={blogs} rowCount={blogs.length} columns={cols} model={{ page: 0, pageSize: Math.max(blogs.length, 1) }} onChange={() => undefined} /></CardContent></Card><Card><CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}><Typography variant="h5" sx={{ mb: 1.5 }}>Tutorials</Typography><AdminDataGridTable rows={tutorials} rowCount={tutorials.length} columns={cols} model={{ page: 0, pageSize: Math.max(tutorials.length, 1) }} onChange={() => undefined} /></CardContent></Card></Stack>;
}
