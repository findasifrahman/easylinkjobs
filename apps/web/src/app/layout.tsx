import type { Metadata } from "next";
import "./globals.css";
import { ThemeRegistry } from "@/components/ThemeRegistry";

export const metadata: Metadata = {
  metadataBase: new URL("https://easylinkjobs.com"),
  title: {
    default: "easylinkjobs",
    template: "%s | easylinkjobs"
  },
  description: "Foreigner-friendly China job platform",
  alternates: {
    languages: {
      en: "/en",
      zh: "/zh",
      bn: "/bn"
    }
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
