"use client";

import CloudUploadRounded from "@mui/icons-material/CloudUploadRounded";
import InsertDriveFileRounded from "@mui/icons-material/InsertDriveFileRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DragEvent, useRef, useState } from "react";

type Props = {
  label: string;
  helperText?: string;
  onSelect: (file: File) => void;
  progress?: number;
  fileName?: string | null;
  accept?: string;
  maxBytes?: number;
  allowedDescription?: string;
};

function formatMegabytes(maxBytes: number) {
  return `${(maxBytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function UploadDropzone({
  label,
  helperText,
  onSelect,
  progress = 0,
  fileName,
  accept,
  maxBytes = 1_048_576,
  allowedDescription,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptedTokens = (accept ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const acceptsFile = (file: File) => {
    if (acceptedTokens.length === 0) {
      return true;
    }
    const fileType = file.type.toLowerCase();
    const fileNameLower = file.name.toLowerCase();
    return acceptedTokens.some((token) => {
      if (token.endsWith("/*")) {
        const prefix = token.slice(0, -1);
        return fileType.startsWith(prefix);
      }
      if (token.startsWith(".")) {
        return fileNameLower.endsWith(token);
      }
      return fileType === token;
    });
  };

  const handleFile = (file: File | null) => {
    if (!file) {
      return;
    }
    if (file.size > maxBytes) {
      setError(`File too large. Maximum allowed size is ${formatMegabytes(maxBytes)}.`);
      return;
    }
    if (!acceptsFile(file)) {
      setError(allowedDescription ?? "This file type is not allowed.");
      return;
    }
    setError(null);
    onSelect(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0] ?? null);
  };

  return (
    <Box
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      sx={{
        border: "1px dashed",
        borderColor: dragging ? "primary.main" : "divider",
        borderRadius: 4,
        p: 2.5,
        cursor: "pointer",
        bgcolor: dragging ? "rgba(17,205,222,0.08)" : "background.paper"
      }}
    >
      <input
        ref={inputRef}
        hidden
        type="file"
        accept={accept}
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
      />
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <CloudUploadRounded color="primary" />
          <Typography variant="body1" fontWeight={700}>
            {label}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {fileName ?? helperText ?? "Drag and drop or click to upload"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {allowedDescription ?? "Maximum allowed file size is 1 MB."}
        </Typography>
        {fileName ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <InsertDriveFileRounded fontSize="small" />
            <Typography variant="body2">{fileName}</Typography>
          </Stack>
        ) : null}
        {error ? <Alert severity="warning" sx={{ py: 0 }}>{error}</Alert> : null}
        {progress > 0 ? <LinearProgress variant="determinate" value={progress} /> : null}
      </Stack>
    </Box>
  );
}
