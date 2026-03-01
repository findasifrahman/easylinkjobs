"use client";

import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

import { deleteOpenAIKey, exportCandidateProfileForLlm, generateAiCv } from "@/lib/api";

export function AiCvCard() {
  const [apiKey, setApiKey] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [translate, setTranslate] = useState(false);
  const [storeKeyEnabled, setStoreKeyEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cv, setCv] = useState("");
  const [exportJson, setExportJson] = useState("");

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AutoAwesomeRounded color="primary" />
            <Typography variant="h5">AI CV generator</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Bring your own OpenAI API key. If you choose to store it, the backend encrypts it at rest. You can delete it any time.
          </Typography>
          <TextField
            label="OpenAI API key (optional if already stored)"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <TextField label="Target role" value={targetRole} onChange={(event) => setTargetRole(event.target.value)} />
          <FormControlLabel
            control={<Switch checked={translate} onChange={(event) => setTranslate(event.target.checked)} />}
            label="Append Chinese translation"
          />
          <FormControlLabel
            control={<Switch checked={storeKeyEnabled} onChange={(event) => setStoreKeyEnabled(event.target.checked)} />}
            label="Store API key securely for later use"
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <Button
              variant="contained"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const response = await generateAiCv({
                    target_role: targetRole || undefined,
                    translate_to_chinese: translate,
                    openai_api_key: apiKey || undefined,
                    use_stored_key: true,
                    store_key: storeKeyEnabled
                  });
                  setCv(response.cv_markdown);
                  setExportJson(JSON.stringify(response.export, null, 2));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "AI CV generation failed");
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? "Generating..." : "Generate CV"}
            </Button>
            <Button
              variant="outlined"
              onClick={async () => {
                try {
                  const response = await exportCandidateProfileForLlm();
                  setExportJson(JSON.stringify(response, null, 2));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Export failed");
                }
              }}
            >
              Preview export JSON
            </Button>
            <Button
              variant="text"
              color="inherit"
              startIcon={<DeleteOutlineRounded />}
              onClick={async () => {
                await deleteOpenAIKey();
                setApiKey("");
                setStoreKeyEnabled(false);
              }}
            >
              Delete stored key
            </Button>
          </Stack>
          {cv ? (
            <Stack spacing={1}>
              <Typography variant="h6">Generated CV</Typography>
              <ReactMarkdown>{cv}</ReactMarkdown>
            </Stack>
          ) : null}
          {exportJson ? (
            <Stack spacing={1}>
              <Typography variant="h6">LLM-ready export</Typography>
              <TextField multiline minRows={8} value={exportJson} InputProps={{ readOnly: true }} />
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
