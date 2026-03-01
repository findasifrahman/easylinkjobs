"use client";

import CampaignRounded from "@mui/icons-material/CampaignRounded";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type Props = {
  label: string;
  items: string[];
};

export function NoticeTicker({ label, items }: Props) {
  const tape = [...items, ...items];

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={2}
      sx={{
        overflow: "hidden",
        borderRadius: 999,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        px: 2,
        py: 1.25,
        boxShadow: (theme) => theme.custom.shadows[1]
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
        <CampaignRounded color="primary" fontSize="small" />
        <Typography variant="body2" fontWeight={800}>
          {label}
        </Typography>
      </Stack>
      <Box sx={{ position: "relative", overflow: "hidden", minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            display: "flex",
            gap: 5,
            width: "max-content",
            animation: "ticker-scroll 30s linear infinite"
          }}
        >
          {tape.map((item, index) => (
            <Typography key={`${item}-${index}`} variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
              {item}
            </Typography>
          ))}
        </Box>
      </Box>
    </Stack>
  );
}
