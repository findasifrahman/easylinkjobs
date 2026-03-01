"use client";

import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

import { createCandidateItem, deleteCandidateItem, getSignedMediaUrl, listCandidateItems, presignUpload, uploadFileToSignedUrl } from "@/lib/api";
import { UploadDropzone } from "@/components/candidate/UploadDropzone";
import { themeTokens } from "@/theme";

const docTypes = ["PASSPORT", "CV", "COVER_LETTER", "CERTIFICATE", "EDUCATION_DOC", "OTHER"] as const;

export function CandidateDocumentsManager() {
  const [documents, setDocuments] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    document_type: "CV",
    title: "",
    expires_at: "",
  });

  async function load() {
    try {
      const rows = await listCandidateItems("documents");
      setDocuments(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleUpload() {
    if (!file) {
      setError("Select a file first.");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const presigned = await presignUpload({
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        purpose: "candidate_document",
        document_type: form.document_type,
      });
      await uploadFileToSignedUrl(presigned.upload_url, file, presigned.headers, setProgress);
      await createCandidateItem("documents", {
        media_asset_id: presigned.asset.id,
        document_type: form.document_type,
        title: form.title || file.name,
        expires_at: form.expires_at || null,
      });
      setFile(null);
      setProgress(0);
      setForm({ document_type: "CV", title: "", expires_at: "" });
      await load();
      setSuccess("Document uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId: string) {
    setError(null);
    setSuccess(null);
    try {
      await deleteCandidateItem("documents", documentId);
      await load();
      setSuccess("Document deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  async function handlePreview(item: Record<string, unknown>) {
    const mediaAssetId = item.mediaAssetId ?? (item.mediaAsset as Record<string, unknown> | null)?.id;
    if (!mediaAssetId) {
      setError("This document has no uploaded file attached.");
      return;
    }
    try {
      const result = await getSignedMediaUrl(String(mediaAssetId));
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed.");
    }
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}
      <Card>
        <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
          <Stack spacing={1.5}>
            <Typography variant="h5">Upload private documents</Typography>
            <Typography variant="body2" color="text.secondary">
              Passport fields are sensitive. Files stay private by default and use signed R2 URLs.
            </Typography>
            <TextField select size="small" label="Document type" value={form.document_type} onChange={(event) => setForm((current) => ({ ...current, document_type: event.target.value }))}>
              {docTypes.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            <TextField size="small" label="Expiry (optional)" type="date" InputLabelProps={{ shrink: true }} value={form.expires_at} onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value }))} />
            <UploadDropzone
              label="Select file"
              helperText="Drag and drop or click to upload"
              accept=".pdf,image/*"
              allowedDescription="PDF or image only. Maximum file size is 1 MB."
              onSelect={(nextFile) => setFile(nextFile)}
              progress={progress}
              fileName={file?.name ?? null}
            />
            <Button variant="contained" disabled={uploading} onClick={() => void handleUpload()}>Upload document</Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: themeTokens.layout.cardPadding.regular }}>
          <Stack spacing={1.5}>
            <Typography variant="h5">Saved documents</Typography>
            {documents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No documents uploaded yet.</Typography>
            ) : (
              documents.map((item) => (
                <Card key={String(item.id)} variant="outlined">
                  <CardContent sx={{ p: 1.5 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
                      <div>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{String(item.title ?? item.documentType ?? "Document")}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {String(item.documentType ?? "")}{item.expiresAt ? ` • valid to ${String(item.expiresAt).slice(0, 10)}` : ""}
                        </Typography>
                      </div>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" startIcon={<OpenInNewRounded fontSize="small" />} onClick={() => void handlePreview(item)}>Preview</Button>
                        <Button size="small" color="error" startIcon={<DeleteOutlineRounded fontSize="small" />} onClick={() => void handleDelete(String(item.id))}>Delete</Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
