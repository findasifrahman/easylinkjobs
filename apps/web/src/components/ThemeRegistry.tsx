"use client";

import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useServerInsertedHTML } from "next/navigation";
import { PropsWithChildren, useMemo, useState } from "react";

import { appTheme } from "@/theme";

export function ThemeRegistry({ children }: PropsWithChildren) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({ key: "mui", prepend: true });
    cache.compat = true;
    const prevInsert = cache.insert as (...args: any[]) => string | void;
    let inserted: string[] = [];
    cache.insert = (...args: any[]) => {
      const serialized = args[1];
      if (!cache.inserted[serialized.name]) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prev = inserted;
      inserted = [];
      return prev;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) {
      return null;
    }
    let styles = "";
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  const content = useMemo(
    () => (
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    ),
    [children]
  );

  return <CacheProvider value={cache}>{content}</CacheProvider>;
}
