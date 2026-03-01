"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { GridColDef } from "@mui/x-data-grid";
import { useEffect, useState } from "react";

import { AdminDataGridTable } from "@/components/admin/AdminDataGridTable";
import { fetchAdminTrackingEvents } from "@/lib/api";
import { themeTokens } from "@/theme";

export function AdminTrackingSection() {
  const [pager, setPager] = useState({ page: 0, pageSize: 20 });
  const [data, setData] = useState<{ items: Array<Record<string, unknown>>; total: number }>({ items: [], total: 0 });
  useEffect(() => { fetchAdminTrackingEvents({ page: pager.page + 1, pageSize: pager.pageSize }).then((r) => setData({ items: r.items, total: r.total })).catch(() => setData({ items: [], total: 0 })); }, [pager]);
  const columns: GridColDef[] = [
    { field: "eventName", headerName: "Event", minWidth: 180 },
    { field: "utmSource", headerName: "UTM source", minWidth: 160 },
    { field: "pageUrl", headerName: "Page", flex: 1, minWidth: 240 },
    { field: "createdAt", headerName: "Created", minWidth: 200 },
  ];
  return <Card><CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}><Stack spacing={2}><Typography variant="h2">Tracking events</Typography><Typography color="text.secondary">Server-side paginated event log for support and analytics checks.</Typography><AdminDataGridTable rows={data.items} rowCount={data.total} columns={columns} model={pager} onChange={(m) => setPager({ page: m.page, pageSize: m.pageSize })} /></Stack></CardContent></Card>;
}
