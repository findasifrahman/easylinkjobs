const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";

type Envelope<T> = {
  ok: boolean;
  data: T;
  error: { code?: string; message: string } | null;
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const payload = (await response.json()) as Envelope<T>;
  if (!payload.ok) {
    throw new Error(payload.error?.message ?? "Request failed");
  }
  return payload.data;
}

export async function fetchPublicJobs(filters?: {
  city?: string;
  visaType?: string;
  nationality?: string;
  source?: string;
  category?: string;
  q?: string;
  visaSponsorship?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();
  if (filters?.city) {
    search.set("city", filters.city);
  }
  if (filters?.category) {
    search.set("category", filters.category);
  }
  if (filters?.visaType) {
    search.set("visa_type", filters.visaType);
  }
  if (typeof filters?.visaSponsorship === "boolean") {
    search.set("visa_sponsorship", String(filters.visaSponsorship));
  }
  if (filters?.nationality) {
    search.set("nationality", filters.nationality);
  }
  if (filters?.q) {
    search.set("q", filters.q);
  }
  if (filters?.source) {
    search.set("source", filters.source);
  }
  if (filters?.page) {
    search.set("page", String(filters.page));
  }
  if (filters?.pageSize) {
    search.set("page_size", String(filters.pageSize));
  }
  const suffix = search.toString() ? `?${search}` : "";
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(`/public/jobs${suffix}`);
}

export async function fetchPublicCategories(locale: string) {
  return request<Array<Record<string, unknown>>>(`/public/categories?locale=${encodeURIComponent(locale.toUpperCase())}`);
}

export async function fetchPublicJob(jobId: string) {
  return request<Record<string, unknown>>(`/jobs/public/${jobId}`);
}

export async function fetchPublicCompanies() {
  return request<Array<Record<string, unknown>>>("/companies/");
}

export async function fetchBlogPosts(page = 1, pageSize = 12) {
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(`/content/blog?page=${page}&page_size=${pageSize}`);
}

export async function fetchBlogPost(slug: string) {
  return request<Record<string, unknown>>(`/content/blog/${slug}`);
}

export async function fetchTutorials(page = 1, pageSize = 12) {
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(`/content/tutorials?page=${page}&page_size=${pageSize}`);
}

export async function fetchTutorial(slug: string) {
  return request<Record<string, unknown>>(`/content/tutorials/${slug}`);
}
