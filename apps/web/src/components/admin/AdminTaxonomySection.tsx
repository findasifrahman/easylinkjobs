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
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminDataGridTable } from "@/components/admin/AdminDataGridTable";
import {
  createAdminTaxonomyCategory,
  createAdminTaxonomyIndustry,
  createAdminTaxonomyJobFunction,
  deleteAdminTaxonomyCategory,
  fetchAdminTaxonomyCategories,
  fetchAdminTaxonomyIndustries,
  fetchAdminTaxonomyJobFunctions,
  updateAdminTaxonomyCategory,
} from "@/lib/api";
import { themeTokens } from "@/theme";

type RowRecord = Record<string, unknown>;

const localeOptions = ["EN", "ZH", "BN"];

const blankCategoryForm = {
  id: "",
  name: "",
  slug: "",
  locale: "EN",
  industry_id: "",
  job_function_id: "",
};

const blankRootForm = {
  name: "",
  slug: "",
  locale: "EN",
};

export function AdminTaxonomySection() {
  const [rows, setRows] = useState<RowRecord[]>([]);
  const [industries, setIndustries] = useState<RowRecord[]>([]);
  const [jobFunctions, setJobFunctions] = useState<RowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [rowCount, setRowCount] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [categoryForm, setCategoryForm] = useState(blankCategoryForm);
  const [industryForm, setIndustryForm] = useState(blankRootForm);
  const [jobFunctionForm, setJobFunctionForm] = useState(blankRootForm);

  const loadTaxonomy = useCallback(async () => {
    setLoading(true);
    try {
      const [categoryPayload, industryRows, functionRows] = await Promise.all([
        fetchAdminTaxonomyCategories(categoryForm.locale, {
          page: paginationModel.page + 1,
          pageSize: paginationModel.pageSize,
        }),
        fetchAdminTaxonomyIndustries(categoryForm.locale),
        fetchAdminTaxonomyJobFunctions(categoryForm.locale),
      ]);
      setRows(categoryPayload.items);
      setRowCount(categoryPayload.total);
      setIndustries(industryRows);
      setJobFunctions(functionRows);
    } catch {
      setRows([]);
      setRowCount(0);
      setIndustries([]);
      setJobFunctions([]);
      setMessage({ type: "error", text: "Could not load taxonomy data." });
    } finally {
      setLoading(false);
    }
  }, [categoryForm.locale, paginationModel.page, paginationModel.pageSize]);

  useEffect(() => {
    void loadTaxonomy();
  }, [loadTaxonomy]);

  function resetCategoryForm() {
    setCategoryForm((current) => ({ ...blankCategoryForm, locale: current.locale }));
  }

  function normalizeSlug(value: string) {
    return value.toLowerCase().trim().replace(/\s+/g, "-");
  }

  async function handleCategorySubmit() {
    const name = categoryForm.name.trim();
    const slug = normalizeSlug(categoryForm.slug);
    if (!name || !slug) {
      setMessage({ type: "error", text: "Category name and slug are required." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = {
        name,
        slug,
        locale: categoryForm.locale,
        industry_id: categoryForm.industry_id || undefined,
        job_function_id: categoryForm.job_function_id || undefined,
      };
      const saved = categoryForm.id
        ? await updateAdminTaxonomyCategory(categoryForm.id, payload)
        : await createAdminTaxonomyCategory(payload);
      await loadTaxonomy();
      resetCategoryForm();
      setMessage({ type: "success", text: categoryForm.id ? "Category updated." : "Category created." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not save category.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    setMessage(null);
    try {
      await deleteAdminTaxonomyCategory(categoryId);
      await loadTaxonomy();
      if (categoryForm.id === categoryId) {
        resetCategoryForm();
      }
      setMessage({ type: "success", text: "Category deleted." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not delete category.",
      });
    }
  }

  async function handleCreateIndustry() {
    const name = industryForm.name.trim();
    const slug = normalizeSlug(industryForm.slug);
    if (!name || !slug) {
      setMessage({ type: "error", text: "Industry name and slug are required." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const created = await createAdminTaxonomyIndustry({
        name,
        slug,
        locale: industryForm.locale,
      });
      setIndustries((prev) =>
        [created, ...prev.filter((row) => String(row.id) !== String(created.id))].sort((a, b) =>
          String(a.name ?? "").localeCompare(String(b.name ?? ""))
        )
      );
      setIndustryForm((current) => ({ ...blankRootForm, locale: current.locale }));
      setMessage({ type: "success", text: "Industry created." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not create industry.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateJobFunction() {
    const name = jobFunctionForm.name.trim();
    const slug = normalizeSlug(jobFunctionForm.slug);
    if (!name || !slug) {
      setMessage({ type: "error", text: "Job function name and slug are required." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const created = await createAdminTaxonomyJobFunction({
        name,
        slug,
        locale: jobFunctionForm.locale,
      });
      setJobFunctions((prev) =>
        [created, ...prev.filter((row) => String(row.id) !== String(created.id))].sort((a, b) =>
          String(a.name ?? "").localeCompare(String(b.name ?? ""))
        )
      );
      setJobFunctionForm((current) => ({ ...blankRootForm, locale: current.locale }));
      setMessage({ type: "success", text: "Job function created." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not create job function.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const columns: GridColDef[] = useMemo(
    () => [
      { field: "name", headerName: "Category", flex: 1, minWidth: 220 },
      { field: "slug", headerName: "Slug", minWidth: 180 },
      { field: "industry_slug", headerName: "Industry", minWidth: 160 },
      { field: "function_slug", headerName: "Function", minWidth: 160 },
      { field: "job_count", headerName: "Open jobs", minWidth: 120 },
      {
        field: "actions",
        headerName: "Actions",
        minWidth: 190,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<RowRecord>) => (
          <Stack direction="row" spacing={1} sx={{ py: 0.75 }}>
            <Button
              size="small"
              variant="text"
              onClick={() =>
                setCategoryForm({
                  id: String(params.row.id ?? ""),
                  name: String(params.row.name ?? ""),
                  slug: String(params.row.slug ?? ""),
                  locale: categoryForm.locale,
                  industry_id:
                    String(
                      industries.find((item) => String(item.slug) === String(params.row.industry_slug))?.id ?? ""
                    ),
                  job_function_id:
                    String(
                      jobFunctions.find((item) => String(item.slug) === String(params.row.function_slug))?.id ?? ""
                    ),
                })
              }
            >
              Edit
            </Button>
            <Button
              size="small"
              variant="text"
              color="error"
              onClick={() => void handleDeleteCategory(String(params.row.id ?? ""))}
            >
              Delete
            </Button>
          </Stack>
        ),
      },
    ],
    [categoryForm.locale, industries, jobFunctions]
  );

  return (
    <Card>
      <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.75}>
            <Typography variant="h2">Categories / Taxonomy</Typography>
            <Typography color="text.secondary">
              Manage industries, job functions, and curated categories that drive the public homepage and job filters.
            </Typography>
          </Stack>

          {message ? <Alert severity={message.type}>{message.text}</Alert> : null}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, xl: 7.5 }}>
              <Card variant="outlined" sx={{ borderColor: "rgba(17,205,222,0.18)", height: "100%" }}>
                <CardContent sx={{ p: themeTokens.layout.cardPadding.compact }}>
                  <Stack spacing={2}>
                    <Typography variant="h4">{categoryForm.id ? "Edit category" : "Add category"}</Typography>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          label="Category name"
                          value={categoryForm.name}
                          fullWidth
                          onChange={(event) =>
                            setCategoryForm((current) => ({ ...current, name: event.target.value }))
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <TextField
                          label="Slug"
                          value={categoryForm.slug}
                          fullWidth
                          onChange={(event) =>
                            setCategoryForm((current) => ({ ...current, slug: normalizeSlug(event.target.value) }))
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                          select
                          label="Locale"
                          value={categoryForm.locale}
                          fullWidth
                          onChange={(event) =>
                            setCategoryForm((current) => ({ ...current, locale: event.target.value }))
                          }
                        >
                          {localeOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <TextField
                          select
                          label="Industry"
                          value={categoryForm.industry_id}
                          fullWidth
                          onChange={(event) =>
                            setCategoryForm((current) => ({ ...current, industry_id: event.target.value }))
                          }
                        >
                          <MenuItem value="">Default first industry</MenuItem>
                          {industries.map((row) => (
                            <MenuItem key={String(row.id)} value={String(row.id)}>
                              {String(row.name ?? row.slug ?? "Industry")}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          select
                          label="Job function"
                          value={categoryForm.job_function_id}
                          fullWidth
                          onChange={(event) =>
                            setCategoryForm((current) => ({ ...current, job_function_id: event.target.value }))
                          }
                        >
                          <MenuItem value="">Default first function</MenuItem>
                          {jobFunctions.map((row) => (
                            <MenuItem key={String(row.id)} value={String(row.id)}>
                              {String(row.name ?? row.slug ?? "Function")}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Stack direction="row" spacing={1.25} sx={{ height: "100%" }}>
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={() => void handleCategorySubmit()}
                            disabled={submitting}
                          >
                            {submitting ? "Saving..." : categoryForm.id ? "Save changes" : "Add category"}
                          </Button>
                          {categoryForm.id ? (
                            <Button variant="outlined" fullWidth onClick={resetCategoryForm}>
                              Cancel
                            </Button>
                          ) : null}
                        </Stack>
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, xl: 4.5 }}>
              <Stack spacing={2}>
                <Card variant="outlined" sx={{ borderColor: "rgba(17,205,222,0.18)" }}>
                  <CardContent sx={{ p: themeTokens.layout.cardPadding.compact }}>
                    <Stack spacing={1.5}>
                      <Typography variant="h4">Add industry</Typography>
                      <TextField
                        label="Industry name"
                        value={industryForm.name}
                        onChange={(event) =>
                          setIndustryForm((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                      <TextField
                        label="Slug"
                        value={industryForm.slug}
                        onChange={(event) =>
                          setIndustryForm((current) => ({ ...current, slug: normalizeSlug(event.target.value) }))
                        }
                      />
                      <Button variant="outlined" onClick={() => void handleCreateIndustry()} disabled={submitting}>
                        Add industry
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ borderColor: "rgba(17,205,222,0.18)" }}>
                  <CardContent sx={{ p: themeTokens.layout.cardPadding.compact }}>
                    <Stack spacing={1.5}>
                      <Typography variant="h4">Add job function</Typography>
                      <TextField
                        label="Job function name"
                        value={jobFunctionForm.name}
                        onChange={(event) =>
                          setJobFunctionForm((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                      <TextField
                        label="Slug"
                        value={jobFunctionForm.slug}
                        onChange={(event) =>
                          setJobFunctionForm((current) => ({
                            ...current,
                            slug: normalizeSlug(event.target.value),
                          }))
                        }
                      />
                      <Button variant="outlined" onClick={() => void handleCreateJobFunction()} disabled={submitting}>
                        Add job function
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          </Grid>

          <AdminDataGridTable
            rows={rows}
            rowCount={rowCount}
            columns={columns}
            model={{ page: paginationModel.page, pageSize: paginationModel.pageSize }}
            onChange={setPaginationModel}
          />

          {loading ? <Typography color="text.secondary">Loading taxonomy...</Typography> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
