"use client";

import ChatRounded from "@mui/icons-material/ChatRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import SmartToyRounded from "@mui/icons-material/SmartToyRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { sendAiChat } from "@/lib/api";

type Message = { role: "assistant" | "user"; body: string };

export function ChatbotWidget({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [chatLocale, setChatLocale] = useState(locale);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", body: "Ask about jobs, profile steps, blog guides, or where to navigate next." }
  ]);

  return (
    <Box sx={{ position: "fixed", right: 20, bottom: 20, zIndex: 1400 }}>
      {open ? (
        <Card sx={{ width: { xs: 320, sm: 360 }, borderRadius: 4, boxShadow: 8 }}>
          <CardContent sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <SmartToyRounded color="primary" />
                  <Typography variant="h6">AI assistant</Typography>
                </Stack>
                <IconButton size="small" onClick={() => setOpen(false)}>
                  <CloseRounded fontSize="small" />
                </IconButton>
              </Stack>
              <Stack direction="row" spacing={1}>
                {["en", "zh", "bn"].map((item) => (
                  <Button key={item} size="small" variant={chatLocale === item ? "contained" : "outlined"} onClick={() => setChatLocale(item)}>
                    {item.toUpperCase()}
                  </Button>
                ))}
              </Stack>
              <Stack spacing={1} sx={{ maxHeight: 260, overflowY: "auto", pr: 0.5 }}>
                {messages.map((message, index) => (
                  <Box
                    key={`${message.role}-${index}`}
                    sx={{
                      alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "88%",
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: message.role === "user" ? "primary.main" : "grey.100",
                      color: message.role === "user" ? "primary.contrastText" : "text.primary"
                    }}
                  >
                    <Typography variant="body2">{message.body}</Typography>
                  </Box>
                ))}
              </Stack>
              <TextField
                size="small"
                placeholder="Ask for help..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={async (event) => {
                  if (event.key === "Enter" && input.trim() && !loading) {
                    event.preventDefault();
                    const message = input.trim();
                    setInput("");
                    setMessages((current) => [...current, { role: "user", body: message }]);
                    setLoading(true);
                    try {
                      const response = await sendAiChat({ message, locale: chatLocale });
                      setMessages((current) => [...current, { role: "assistant", body: response.reply }]);
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
              />
              <Button
                variant="contained"
                disabled={loading || !input.trim()}
                onClick={async () => {
                  const message = input.trim();
                  if (!message) return;
                  setInput("");
                  setMessages((current) => [...current, { role: "user", body: message }]);
                  setLoading(true);
                  try {
                    const response = await sendAiChat({ message, locale: chatLocale });
                    setMessages((current) => [...current, { role: "assistant", body: response.reply }]);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? "Thinking..." : "Send"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Button variant="contained" startIcon={<ChatRounded />} onClick={() => setOpen(true)} sx={{ borderRadius: 999 }}>
          Ask AI
        </Button>
      )}
    </Box>
  );
}
