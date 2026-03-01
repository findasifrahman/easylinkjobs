"use client";

import Box from "@mui/material/Box";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";

type AnyRecord = Record<string, unknown>;
type Pager = { page: number; pageSize: number };

export function AdminDataGridTable({
  rows,
  rowCount,
  columns,
  model,
  onChange,
}: {
  rows: AnyRecord[];
  rowCount: number;
  columns: GridColDef[];
  model: Pager;
  onChange: (model: GridPaginationModel) => void;
}) {
  return (
    <Box sx={{ height: 420 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        rowCount={rowCount}
        paginationMode="server"
        paginationModel={model}
        onPaginationModelChange={onChange}
        pageSizeOptions={[5, 10, 25, 50]}
        disableRowSelectionOnClick
        columnHeaderHeight={42}
        rowHeight={46}
        sx={{
          border: 0,
          "& .MuiDataGrid-columnHeaders": { borderRadius: 3, bgcolor: "rgba(17,205,222,0.06)" },
          "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700, fontSize: "0.82rem" },
          "& .MuiDataGrid-cell": { fontSize: "0.86rem" },
        }}
      />
    </Box>
  );
}
