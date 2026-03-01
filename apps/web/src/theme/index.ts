import { alpha, createTheme, responsiveFontSizes } from "@mui/material/styles";

export const themeTokens = {
  palette: {
    primary: "#11CDDE",
    accent: "#FD7C6F",
    surface: "#FFFFFF",
    ink: "#0F172A",
    inkSoft: "#1F2937",
    muted: "#667085",
    mutedSoft: "#94A3B8",
    border: "#E2E8F0",
    borderStrong: "#D6E0EA",
    mist: "#EAFBFC",
    sand: "#FFF4F1",
    fog: "#F8FBFD",
    night: "#071A24"
  },
  layout: {
    contentMaxWidth: 1240,
    readingWidth: 1080,
    gutterX: "clamp(16px, 2.2vw, 28px)",
    sectionGap: {
      mobile: 4.5,
      desktop: 6
    },
    cardPadding: {
      compact: 2.25,
      regular: 3,
      spacious: 3.5
    }
  },
  shadows: [
    "none",
    "0 10px 28px rgba(15, 23, 42, 0.06)",
    "0 12px 36px rgba(15, 23, 42, 0.08)",
    "0 14px 40px rgba(17, 205, 222, 0.10)",
    "0 18px 46px rgba(253, 124, 111, 0.14)"
  ] as const
} as const;

declare module "@mui/material/styles" {
  interface Theme {
    custom: typeof themeTokens;
  }
  interface ThemeOptions {
    custom?: typeof themeTokens;
  }
}

let baseTheme = createTheme({
  custom: themeTokens,
  palette: {
    mode: "light",
    primary: { main: themeTokens.palette.primary, contrastText: themeTokens.palette.ink },
    secondary: { main: themeTokens.palette.accent, contrastText: themeTokens.palette.fog },
    text: {
      primary: themeTokens.palette.inkSoft,
      secondary: themeTokens.palette.muted
    },
    background: {
      default: themeTokens.palette.fog,
      paper: themeTokens.palette.surface
    },
    divider: themeTokens.palette.border
  },
  shape: {
    borderRadius: 4
  },
  spacing: 4,
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Noto Sans SC", "Noto Sans Bengali", sans-serif',
    h1: { fontSize: "clamp(2.1rem, 4.1vw, 3.45rem)", lineHeight: 1.02, fontWeight: 780, letterSpacing: "-0.03em" },
    h2: { fontSize: "clamp(1.5rem, 2.5vw, 2.3rem)", lineHeight: 1.08, fontWeight: 760, letterSpacing: "-0.025em"},
    h3: { fontSize: "clamp(1.25rem, 1.9vw, 1.8rem)", lineHeight: 1.12, fontWeight: 720 },
    h4: { fontSize: "clamp(1.08rem, 1.4vw, 1.36rem)", lineHeight: 1.18, fontWeight: 700 },
    h5: { fontSize: "0.98rem", lineHeight: 1.24, fontWeight: 700 },
    h6: { fontSize: "0.9rem", lineHeight: 1.28, fontWeight: 700 },
    body1: { fontSize: "0.95rem", lineHeight: 1.58, fontWeight: 500, color: themeTokens.palette.muted },
    body2: { fontSize: "0.86rem", lineHeight: 1.55, fontWeight: 500, color: themeTokens.palette.muted },
    button: { textTransform: "none", fontWeight: 700, fontSize: "0.92rem", letterSpacing: "-0.01em" }
  },
  components: {
    MuiContainer: {
      defaultProps: {
        maxWidth: false
      },
      styleOverrides: {
        root: {
          width: "100%",
          maxWidth: `${themeTokens.layout.contentMaxWidth}px`,
          paddingLeft: themeTokens.layout.gutterX,
          paddingRight: themeTokens.layout.gutterX
        }
      }
    },
    MuiAppBar: {
      defaultProps: {
        color: "transparent",
        elevation: 0
      },
      styleOverrides: {
        root: {
          backdropFilter: "blur(14px)",
          backgroundColor: alpha(themeTokens.palette.surface, 0.8),
          borderBottom: `1px solid ${alpha(themeTokens.palette.borderStrong, 0.75)}`
        }
      }
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 68
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none"
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: `1px solid ${themeTokens.palette.border}`,
          boxShadow: themeTokens.shadows[1],
          backgroundColor: alpha(themeTokens.palette.surface, 0.94)
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 18,
          minHeight: 40,
          boxShadow: "none"
        },
        contained: {
          color: themeTokens.palette.ink
        },
        containedPrimary: {
          color: themeTokens.palette.fog,
          backgroundImage: "linear-gradient(135deg, rgba(17,205,222,0.94), rgba(24,190,212,0.94))",
          "&:hover": {
            boxShadow: themeTokens.shadows[2],
            backgroundImage: "linear-gradient(135deg, rgba(15,192,209,0.96), rgba(20,177,197,0.96))"
          }
        },
        containedSecondary: {
          color: themeTokens.palette.ink
        },
        outlined: {
          borderColor: themeTokens.palette.borderStrong,
          color: themeTokens.palette.inkSoft,
          "&:hover": {
            borderColor: themeTokens.palette.primary,
            backgroundColor: alpha(themeTokens.palette.primary, 0.05)
          }
        },
        text: {
          color: themeTokens.palette.accent,
          "&:hover": {
            backgroundColor: alpha(themeTokens.palette.primary, 0.06)
          }
        }
      }
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: "inherit",
          textDecorationColor: "transparent",
          transition: "color 120ms ease, text-decoration-color 120ms ease",
          "&:hover": {
            color: themeTokens.palette.primary,
            textDecorationColor: alpha(themeTokens.palette.primary, 0.45)
          }
        }
      }
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: themeTokens.palette.accent
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600
        }
      }
    }
  }
});

baseTheme = responsiveFontSizes(baseTheme, {
  breakpoints: ["sm", "md", "lg"],
  factor: 2.4,
  variants: ["h1", "h2", "h3", "h4", "body1", "body2"]
});

export const appTheme = baseTheme;
