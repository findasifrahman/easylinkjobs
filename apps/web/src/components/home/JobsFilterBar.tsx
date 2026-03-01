"use client";

import SearchRounded from "@mui/icons-material/SearchRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { trackEvent } from "@/components/tracking/TrackingProvider";

export function JobsFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const activeVisa = searchParams.get("visa_sponsorship");
  const activeCategory = searchParams.get("category");

  const filterChips = useMemo(
    () => [
      { label: "Visa sponsored", key: "visa_sponsorship", value: "true", active: activeVisa === "true" },
      { label: "No visa", key: "visa_sponsorship", value: "false", active: activeVisa === "false" },
      { label: "Remote", key: "q", value: "remote", active: searchParams.get("q") === "remote" },
      { label: "English only", key: "q", value: "english", active: searchParams.get("q") === "english" },
    ],
    [activeVisa, searchParams]
  );

  function pushParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value && value.trim()) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(params.toString() ? `${pathname}?${params}` : pathname);
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
        <TextField
          fullWidth
          placeholder="Search title, skill, city"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded color="action" />
              </InputAdornment>
            )
          }}
        />
        <Button
          variant="contained"
          onClick={() => {
            void trackEvent("search", { query, category: activeCategory });
            pushParams({ q: query || null });
          }}
        >
          Search
        </Button>
      </Stack>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {filterChips.map((item) => (
          <Chip
            key={`${item.key}-${item.value}`}
            label={item.label}
            variant={item.active ? "filled" : "outlined"}
            color={item.active ? "primary" : "default"}
            onClick={() => {
              const isTogglingOff = item.active;
              pushParams({ [item.key]: isTogglingOff ? null : item.value });
            }}
          />
        ))}
      </Box>
    </Stack>
  );
}
