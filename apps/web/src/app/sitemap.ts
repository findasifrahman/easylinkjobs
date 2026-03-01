import type { MetadataRoute } from "next";

import { fetchBlogPosts, fetchPublicCompanies, fetchPublicJobs, fetchTutorials } from "@/lib/server-api";

const baseUrl = "https://easylinkjobs.com";
const locales = ["en", "zh", "bn"];
const staticPaths = ["", "/jobs", "/companies", "/blog", "/tutorials", "/about"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [jobsPayload, companies, blog, tutorials] = await Promise.all([
    fetchPublicJobs({ pageSize: 100 }).catch(() => ({ items: [] as Array<Record<string, unknown>> })),
    fetchPublicCompanies().catch(() => []),
    fetchBlogPosts().catch(() => ({ items: [] as Array<Record<string, unknown>> })),
    fetchTutorials().catch(() => ({ items: [] as Array<Record<string, unknown>> }))
  ]);
  const jobs = jobsPayload.items;

  const staticEntries = locales.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: new Date()
    }))
  );

  const dynamicEntries = locales.flatMap((locale) => [
    ...jobs.flatMap((job) => [
      { url: `${baseUrl}/${locale}/jobs/${String(job.id)}`, lastModified: new Date() },
      {
        url: `${baseUrl}/${locale}/jobs/in/${String(job.city ?? "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")}`,
        lastModified: new Date()
      }
    ]),
    ...companies.map((company) => ({
      url: `${baseUrl}/${locale}/companies/${String(company.slug ?? company.id)}`,
      lastModified: new Date()
    })),
    ...blog.items.map((post) => ({
      url: `${baseUrl}/${locale}/blog/${String(post.slug)}`,
      lastModified: new Date()
    })),
    ...tutorials.items.map((post) => ({
      url: `${baseUrl}/${locale}/tutorials/${String(post.slug)}`,
      lastModified: new Date()
    })),
    { url: `${baseUrl}/${locale}/jobs/visa/sponsored`, lastModified: new Date() },
    { url: `${baseUrl}/${locale}/jobs/nationality/bangladesh`, lastModified: new Date() }
  ]);

  return [...staticEntries, ...dynamicEntries];
}
