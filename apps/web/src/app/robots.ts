import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/admin",
          "/en/dashboard",
          "/zh/dashboard",
          "/bn/dashboard",
          "/en/dashboard/",
          "/zh/dashboard/",
          "/bn/dashboard/"
        ]
      }
    ],
    sitemap: "https://easylinkjobs.com/sitemap.xml"
  };
}
