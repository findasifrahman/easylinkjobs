"use client";

const API_BASE = "/api/backend";
const ACCESS_KEY = "easylinkjobs_access_token";
const REFRESH_KEY = "easylinkjobs_refresh_token";
const REMEMBER_KEY = "easylinkjobs_remember_me";

type Envelope<T> = {
  ok: boolean;
  data: T;
  error: { code?: string; message: string } | null;
};

type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

export type UserSession = {
  id: string;
  email: string;
  status: string;
  last_login_at: string | null;
  display_name: string;
  role_hint: "guest" | "candidate" | "company" | "admin";
  candidate_id: string | null;
  primary_company: Record<string, unknown> | null;
  company_memberships: Array<Record<string, unknown>>;
  permission_summary: {
    global: string[];
    by_company: Record<string, string[]>;
  };
};

function getStorage(type: "local" | "session"): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return type === "local" ? window.localStorage : window.sessionStorage;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, persistent: boolean): void {
  if (typeof document === "undefined") {
    return;
  }
  const parts = [`${name}=${encodeURIComponent(value)}`, "path=/", "samesite=lax"];
  if (persistent) {
    parts.push(`max-age=${60 * 60 * 24 * 14}`);
  }
  document.cookie = parts.join("; ");
}

function clearCookie(name: string): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function getTokenFromStorage(key: string): string | null {
  const local = getStorage("local")?.getItem(key);
  if (local) {
    return local;
  }
  const session = getStorage("session")?.getItem(key);
  if (session) {
    return session;
  }
  return readCookie(key);
}

function getPreferredStorageForRefresh(): Storage | null {
  const local = getStorage("local");
  if (local?.getItem(REFRESH_KEY)) {
    return local;
  }
  const session = getStorage("session");
  if (session?.getItem(REFRESH_KEY)) {
    return session;
  }
  return local;
}

export function getAccessToken(): string | null {
  return getTokenFromStorage(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return getTokenFromStorage(REFRESH_KEY);
}

export function setAuthTokens(accessToken: string, refreshToken: string, options?: { remember?: boolean }): void {
  const remember = options?.remember ?? true;
  const local = getStorage("local");
  const session = getStorage("session");
  if (!local || !session) {
    return;
  }
  local.removeItem(ACCESS_KEY);
  local.removeItem(REFRESH_KEY);
  session.removeItem(ACCESS_KEY);
  session.removeItem(REFRESH_KEY);
  const target = remember ? local : session;
  target.setItem(ACCESS_KEY, accessToken);
  target.setItem(REFRESH_KEY, refreshToken);
  local.setItem(REMEMBER_KEY, remember ? "true" : "false");
  writeCookie(ACCESS_KEY, accessToken, remember);
  writeCookie(REFRESH_KEY, refreshToken, remember);
}

export function clearAuthTokens(): void {
  const local = getStorage("local");
  const session = getStorage("session");
  if (!local || !session) {
    return;
  }
  local.removeItem(ACCESS_KEY);
  local.removeItem(REFRESH_KEY);
  session.removeItem(ACCESS_KEY);
  session.removeItem(REFRESH_KEY);
  local.removeItem(REMEMBER_KEY);
  clearCookie(ACCESS_KEY);
  clearCookie(REFRESH_KEY);
}

export function hasAuthTokens(): boolean {
  return Boolean(getAccessToken() && getRefreshToken());
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  const payload = (await response.json()) as Envelope<{ access_token: string; token_type: string }>;
  if (!response.ok || !payload.ok) {
    clearAuthTokens();
    return null;
  }
  getPreferredStorageForRefresh()?.setItem(ACCESS_KEY, payload.data.access_token);
  return payload.data.access_token;
}

async function request<T>(path: string, init?: RequestInit, auth = false, retry = true): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (auth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  if (auth && response.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, init, auth, false);
    }
  }
  const payload = (await response.json()) as Envelope<T> & { detail?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error?.message ?? payload.detail ?? "Request failed");
  }
  return payload.data;
}

export async function signupCandidate(payload: Record<string, unknown>) {
  return request<{
    access_token: string;
    refresh_token: string;
    profile_completion_score: number;
    user_id: string;
    candidate_id: string;
  }>("/auth/signup/candidate", { method: "POST", body: JSON.stringify(payload) });
}

export async function signupCompany(payload: Record<string, unknown>) {
  return request<{
    access_token: string;
    refresh_token: string;
    user_id: string;
    company_id: string;
    company_slug: string;
    verification_status: string;
  }>("/auth/signup/company", { method: "POST", body: JSON.stringify(payload) });
}

export async function loginUser(payload: { email: string; password: string }) {
  return request<{
    access_token: string;
    refresh_token: string;
    token_type: string;
  }>("/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

export async function forgotPassword(payload: { email: string }) {
  return request<{ submitted: boolean; message: string }>(
    "/auth/forgot-password",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export async function resetPassword(payload: { token: string; new_password: string }) {
  return request<{ reset: boolean }>("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) });
}

export async function fetchCurrentUser() {
  return request<UserSession>("/users/me", { method: "GET" }, true);
}

export async function logoutUser() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await request<Record<string, unknown>>(
        "/auth/logout",
        { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
        false
      );
    } catch {
      // Clear local auth even if server-side logout fails.
    }
  }
  clearAuthTokens();
}

export async function updateCandidateProfile(payload: Record<string, unknown>) {
  return request<{ profile: Record<string, unknown>; completion_score: number }>(
    "/candidate/profile",
    { method: "PUT", body: JSON.stringify(payload) },
    true
  );
}

export async function uploadCandidateProfilePhoto(file: File) {
  const presigned = await presignUpload({
    filename: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    purpose: "candidate_profile_photo",
  });
  await uploadFileToSignedUrl(presigned.upload_url, file, presigned.headers, () => undefined);
  return updateCandidateProfile({
    profile_image_media_asset_id: presigned.asset.id,
  });
}

export async function createCandidateItem(
  section: "education" | "experience" | "skills" | "languages" | "certifications" | "documents",
  payload: Record<string, unknown>
) {
  return request<{ item: Record<string, unknown>; completion_score: number }>(
    `/candidate/${section}`,
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

export async function fetchCandidateProfile() {
  return request<{
    candidate: Record<string, unknown>;
    completion_score: number;
    profile: Record<string, unknown>;
    education: Array<Record<string, unknown>>;
    experience: Array<Record<string, unknown>>;
    skills: Array<Record<string, unknown>>;
    languages: Array<Record<string, unknown>>;
    certifications: Array<Record<string, unknown>>;
    documents: Array<Record<string, unknown>>;
  }>("/candidate/profile", { method: "GET" }, true);
}

export async function listCandidateItems(
  section: "education" | "experience" | "skills" | "languages" | "certifications" | "documents"
) {
  return request<Array<Record<string, unknown>>>(`/candidate/${section}`, { method: "GET" }, true);
}

export async function updateCandidateItem(
  section: "education" | "experience" | "skills" | "languages" | "certifications" | "documents",
  itemId: string,
  payload: Record<string, unknown>
) {
  return request<{ item: Record<string, unknown>; completion_score: number }>(
    `/candidate/${section}/${itemId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    true
  );
}

export async function deleteCandidateItem(
  section: "education" | "experience" | "skills" | "languages" | "certifications" | "documents",
  itemId: string
) {
  return request<{ deleted: boolean; completion_score: number }>(
    `/candidate/${section}/${itemId}`,
    { method: "DELETE" },
    true
  );
}

export async function fetchMyApplications() {
  return request<Array<Record<string, unknown>>>("/applications/mine", { method: "GET" }, true);
}

export async function changePassword(payload: { current_password: string; new_password: string }) {
  return request<{ changed: boolean }>(
    "/auth/change-password",
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

export async function getSignedMediaUrl(assetId: string, download = false) {
  return request<{ url: string; expires_in: number; asset_id: string }>(
    `/media/${assetId}/signed-url?download=${download ? "true" : "false"}`,
    { method: "GET" },
    true
  );
}

export async function fetchCompanyJobs(companyId: string) {
  return request<Array<Record<string, unknown>>>(
    `/jobs/mine?company_id=${encodeURIComponent(companyId)}`,
    { method: "GET", headers: { "X-Company-Id": companyId } },
    true
  );
}

export async function fetchCompanyJobsTable(companyId: string, options: PaginationOptions = {}) {
  const search = new URLSearchParams();
  search.set("page", String(options.page ?? 1));
  search.set("page_size", String(options.pageSize ?? 10));
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(
    `/jobs/company/${encodeURIComponent(companyId)}/table?${search}`,
    { method: "GET", headers: { "X-Company-Id": companyId } },
    true
  );
}

export async function fetchCompanies() {
  return request<Array<Record<string, unknown>>>("/companies/", { method: "GET" });
}

export async function fetchCompanyProfile(companyId: string) {
  return request<Record<string, unknown>>(`/companies/${companyId}`, { method: "GET" });
}

export async function fetchCompanyMembers(companyId: string, options: PaginationOptions = {}) {
  const search = new URLSearchParams();
  search.set("page", String(options.page ?? 1));
  search.set("page_size", String(options.pageSize ?? 10));
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
    seat_summary: {
      included_seats: number;
      used_seats: number;
      available_seats: number;
      requires_upgrade: boolean;
    };
  }>(
    `/companies/${companyId}/members?${search}`,
    { method: "GET", headers: { "X-Company-Id": companyId } },
    true
  );
}

export async function updateCompanyProfile(companyId: string, payload: Record<string, unknown>) {
  return request<Record<string, unknown>>(
    `/companies/${companyId}`,
    {
      method: "PATCH",
      headers: { "X-Company-Id": companyId },
      body: JSON.stringify(payload),
    },
    true
  );
}

export async function createCompanyJob(payload: Record<string, unknown>) {
  const companyId = typeof payload.company_id === "string" ? payload.company_id : "";
  return request<Record<string, unknown>>(
    "/jobs/",
    {
      method: "POST",
      headers: companyId ? { "X-Company-Id": companyId } : undefined,
      body: JSON.stringify(payload),
    },
    true
  );
}

export async function applyToJob(payload: { job_id: string; cover_letter?: string; screening_answers?: Record<string, unknown> }) {
  return request<Record<string, unknown>>("/applications/apply", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function updateApplicationStatus(applicationId: string, status: string, companyId: string) {
  return request<Record<string, unknown>>(
    `/applications/${applicationId}/status`,
    { method: "PATCH", headers: { "X-Company-Id": companyId }, body: JSON.stringify({ status }) },
    true
  );
}

export async function fetchCompanyApplicants(companyId: string, statusFilter?: string) {
  const search = new URLSearchParams();
  if (statusFilter) {
    search.set("status_filter", statusFilter);
  }
  return request<{
    items: Array<Record<string, unknown>>;
    can_view_contact: boolean;
  }>(
    `/applications/company/${companyId}/applicants${search.toString() ? `?${search}` : ""}`,
    { method: "GET", headers: { "X-Company-Id": companyId } },
    true
  );
}

export async function fetchCompanyApplicantsFiltered(companyId: string, options?: { statusFilter?: string; jobId?: string }) {
  const search = new URLSearchParams();
  if (options?.statusFilter) {
    search.set("status_filter", options.statusFilter);
  }
  if (options?.jobId) {
    search.set("job_id", options.jobId);
  }
  return request<{
    items: Array<Record<string, unknown>>;
    can_view_contact: boolean;
  }>(
    `/applications/company/${companyId}/applicants${search.toString() ? `?${search}` : ""}`,
    { method: "GET", headers: { "X-Company-Id": companyId } },
    true
  );
}

export async function fetchCompanyApplicantsTable(
  companyId: string,
  options?: { statusFilter?: string; jobId?: string; page?: number; pageSize?: number }
) {
  const search = new URLSearchParams();
  if (options?.statusFilter) {
    search.set("status_filter", options.statusFilter);
  }
  if (options?.jobId) {
    search.set("job_id", options.jobId);
  }
  search.set("page", String(options?.page ?? 1));
  search.set("page_size", String(options?.pageSize ?? 10));
  return request<{
    items: Array<Record<string, unknown>>;
    can_view_contact: boolean;
    total: number;
    page: number;
    page_size: number;
  }>(
    `/applications/company/${companyId}/applicants/table?${search.toString()}`,
    { method: "GET", headers: { "X-Company-Id": companyId } },
    true
  );
}

export async function fetchRecruiterCandidates(
  companyId: string,
  options?: { q?: string; categoryId?: string; page?: number; pageSize?: number }
) {
  const search = new URLSearchParams();
  if (options?.q) {
    search.set("q", options.q);
  }
  if (options?.categoryId) {
    search.set("category_id", options.categoryId);
  }
  search.set("page", String(options?.page ?? 1));
  search.set("page_size", String(options?.pageSize ?? 12));
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
    premium_enabled: boolean;
  }>(
    `/candidate/recruiter-search?${search.toString()}`,
    { method: "GET", headers: { "X-Company-Id": companyId } },
    true
  );
}

export async function fetchRecruiterCandidateProfile(companyId: string, candidateId: string) {
  return request<Record<string, unknown>>(
    `/candidate/recruiter-view/${candidateId}`,
    { method: "GET", headers: { "X-Company-Id": companyId } },
    true
  );
}

export async function fetchCompanyOverview(companyId: string) {
  return request<{ views: number; applies: number; shortlisted: number }>(
    `/applications/company/${companyId}/overview`,
    { method: "GET", headers: { "X-Company-Id": companyId } },
    true
  );
}

export async function fetchApplicationNotes(applicationId: string, companyId: string) {
  return request<Array<Record<string, unknown>>>(
    `/applications/${applicationId}/notes`,
    { method: "GET", headers: { "X-Company-Id": companyId } },
    true
  );
}

export async function addApplicationNote(
  applicationId: string,
  payload: { body: string; is_private?: boolean },
  companyId: string
) {
  return request<Record<string, unknown>>(
    `/applications/${applicationId}/notes`,
    { method: "POST", headers: { "X-Company-Id": companyId }, body: JSON.stringify(payload) },
    true
  );
}

export async function updateCompanyJob(jobId: string, payload: Record<string, unknown>) {
  const companyId = typeof payload.company_id === "string" ? payload.company_id : "";
  return request<Record<string, unknown>>(
    `/jobs/${jobId}`,
    {
      method: "PATCH",
      headers: companyId ? { "X-Company-Id": companyId } : undefined,
      body: JSON.stringify(payload),
    },
    true
  );
}

export async function deleteCompanyJob(jobId: string, companyId: string) {
  return request<Record<string, unknown>>(
    `/jobs/${jobId}`,
    { method: "DELETE", headers: { "X-Company-Id": companyId } },
    true
  );
}

export async function fetchPublicCategories(locale = "en") {
  return request<Array<Record<string, unknown>>>(
    `/public/categories?locale=${encodeURIComponent(locale)}`,
    { method: "GET" }
  );
}

export async function fetchAdminAnalytics(days = 14) {
  return request<{
    series: Array<Record<string, number | string>>;
    totals: Record<string, number>;
    top_sources: Array<Record<string, number | string>>;
    funnel: Record<string, number>;
    archive_status: Record<string, number>;
  }>(`/admin/analytics/overview?days=${days}`, { method: "GET" }, true);
}

export async function fetchAdminTrackingEvents(options: PaginationOptions = {}) {
  const search = new URLSearchParams();
  search.set("page", String(options.page ?? 1));
  search.set("page_size", String(options.pageSize ?? 20));
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(`/admin/tracking-events?${search}`, { method: "GET" }, true);
}

export async function fetchAdminTaxonomyCategories(locale = "EN", options: PaginationOptions = {}) {
  const search = new URLSearchParams();
  search.set("locale", locale);
  search.set("page", String(options.page ?? 1));
  search.set("page_size", String(options.pageSize ?? 10));
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(
    `/admin/taxonomy/categories?${search.toString()}`,
    { method: "GET" },
    true
  );
}

export async function fetchAdminTaxonomyIndustries(locale = "EN") {
  return request<Array<Record<string, unknown>>>(
    `/admin/taxonomy/industries?locale=${encodeURIComponent(locale)}`,
    { method: "GET" },
    true
  );
}

export async function fetchAdminTaxonomyJobFunctions(locale = "EN") {
  return request<Array<Record<string, unknown>>>(
    `/admin/taxonomy/job-functions?locale=${encodeURIComponent(locale)}`,
    { method: "GET" },
    true
  );
}

export async function createAdminTaxonomyCategory(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>(
    "/admin/taxonomy/categories",
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

export async function updateAdminTaxonomyCategory(categoryId: string, payload: Record<string, unknown>) {
  return request<Record<string, unknown>>(
    `/admin/taxonomy/categories/${categoryId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    true
  );
}

export async function deleteAdminTaxonomyCategory(categoryId: string) {
  return request<Record<string, unknown>>(`/admin/taxonomy/categories/${categoryId}`, { method: "DELETE" }, true);
}

export async function createAdminTaxonomyIndustry(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>(
    "/admin/taxonomy/industries",
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

export async function createAdminTaxonomyJobFunction(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>(
    "/admin/taxonomy/job-functions",
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

export async function fetchAdminUsers(options: PaginationOptions = {}) {
  const search = new URLSearchParams();
  search.set("page", String(options.page ?? 1));
  search.set("page_size", String(options.pageSize ?? 10));
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(`/admin/users?${search}`, { method: "GET" }, true);
}

export async function createAdminUser(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>("/admin/users", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function updateAdminUser(userId: string, payload: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify(payload) }, true);
}

export async function deleteAdminUser(userId: string) {
  return request<Record<string, unknown>>(`/admin/users/${userId}`, { method: "DELETE" }, true);
}

export async function fetchAdminCandidates(options: PaginationOptions = {}) {
  const search = new URLSearchParams();
  search.set("page", String(options.page ?? 1));
  search.set("page_size", String(options.pageSize ?? 10));
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(`/admin/candidates?${search}`, { method: "GET" }, true);
}

export async function createAdminCandidate(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>("/admin/candidates", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function updateAdminCandidate(candidateId: string, payload: Record<string, unknown>) {
  return request<Record<string, unknown>>(
    `/admin/candidates/${candidateId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    true
  );
}

export async function deleteAdminCandidate(candidateId: string) {
  return request<Record<string, unknown>>(`/admin/candidates/${candidateId}`, { method: "DELETE" }, true);
}

export async function fetchAdminCompanies(options: PaginationOptions = {}) {
  const search = new URLSearchParams();
  search.set("page", String(options.page ?? 1));
  search.set("page_size", String(options.pageSize ?? 10));
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(`/admin/companies?${search}`, { method: "GET" }, true);
}

export async function createAdminCompany(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>("/admin/companies", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function updateAdminCompany(companyId: string, payload: Record<string, unknown>) {
  return request<Record<string, unknown>>(
    `/admin/companies/${companyId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    true
  );
}

export async function verifyAdminCompany(companyId: string) {
  return request<Record<string, unknown>>(`/admin/companies/${companyId}/verify`, { method: "POST" }, true);
}

export async function deleteAdminCompany(companyId: string) {
  return request<Record<string, unknown>>(`/admin/companies/${companyId}`, { method: "DELETE" }, true);
}

export async function fetchAdminJobs(options: PaginationOptions = {}) {
  const search = new URLSearchParams();
  search.set("page", String(options.page ?? 1));
  search.set("page_size", String(options.pageSize ?? 10));
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(`/admin/jobs?${search}`, { method: "GET" }, true);
}

export async function createAdminJob(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>("/admin/jobs", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function updateAdminJob(jobId: string, payload: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/admin/jobs/${jobId}`, { method: "PATCH", body: JSON.stringify(payload) }, true);
}

export async function approveAdminJob(jobId: string) {
  return request<Record<string, unknown>>(`/admin/jobs/${jobId}/approve`, { method: "POST" }, true);
}

export async function rejectAdminJob(jobId: string) {
  return request<Record<string, unknown>>(`/admin/jobs/${jobId}/reject`, { method: "POST" }, true);
}

export async function deleteAdminJob(jobId: string) {
  return request<Record<string, unknown>>(`/admin/jobs/${jobId}`, { method: "DELETE" }, true);
}

export async function fetchAdminBlogPosts(options: PaginationOptions = {}) {
  const search = new URLSearchParams();
  search.set("page", String(options.page ?? 1));
  search.set("page_size", String(options.pageSize ?? 10));
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(`/admin/blog-posts?${search}`, { method: "GET" }, true);
}

export async function createAdminBlogPost(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>("/admin/blog-posts", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function updateAdminBlogPost(postId: string, payload: Record<string, unknown>) {
  return request<Record<string, unknown>>(
    `/admin/blog-posts/${postId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    true
  );
}

export async function deleteAdminBlogPost(postId: string) {
  return request<Record<string, unknown>>(`/admin/blog-posts/${postId}`, { method: "DELETE" }, true);
}

export async function fetchAdminTutorials(options: PaginationOptions = {}) {
  const search = new URLSearchParams();
  search.set("page", String(options.page ?? 1));
  search.set("page_size", String(options.pageSize ?? 10));
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(`/admin/tutorials?${search}`, { method: "GET" }, true);
}

export async function createAdminTutorial(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>("/admin/tutorials", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function updateAdminTutorial(tutorialId: string, payload: Record<string, unknown>) {
  return request<Record<string, unknown>>(
    `/admin/tutorials/${tutorialId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    true
  );
}

export async function deleteAdminTutorial(tutorialId: string) {
  return request<Record<string, unknown>>(`/admin/tutorials/${tutorialId}`, { method: "DELETE" }, true);
}

export async function fetchAdminSubscriptionPlans() {
  return request<Array<Record<string, unknown>>>("/admin/subscription-plans", { method: "GET" }, true);
}

export async function fetchAdminCompanyPremium(companyId: string) {
  return request<{
    company_id: string;
    subscriptions: Array<Record<string, unknown>>;
    payment_customers: Array<Record<string, unknown>>;
  }>(`/admin/companies/${companyId}/premium`, { method: "GET" }, true);
}

export async function grantAdminCompanyPremium(
  companyId: string,
  payload: { plan_code: string; duration_days: number; provider?: string; external_ref?: string }
) {
  return request<Record<string, unknown>>(
    `/admin/companies/${companyId}/premium/grant`,
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

export async function grantAdminCompanyUnlock(
  companyId: string,
  payload: { entitlement_code?: string; duration_days: number }
) {
  return request<Record<string, unknown>>(
    `/admin/companies/${companyId}/premium/unlock`,
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

export async function fetchBlogPosts(options: PaginationOptions = {}) {
  const search = new URLSearchParams();
  search.set("page", String(options.page ?? 1));
  search.set("page_size", String(options.pageSize ?? 12));
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(`/content/blog?${search}`, { method: "GET" });
}

export async function fetchBlogPost(slug: string) {
  return request<Record<string, unknown>>(`/content/blog/${slug}`, { method: "GET" });
}

export async function fetchTutorials(options: PaginationOptions = {}) {
  const search = new URLSearchParams();
  search.set("page", String(options.page ?? 1));
  search.set("page_size", String(options.pageSize ?? 12));
  return request<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    page_size: number;
  }>(`/content/tutorials?${search}`, { method: "GET" });
}

export async function fetchTutorial(slug: string) {
  return request<Record<string, unknown>>(`/content/tutorials/${slug}`, { method: "GET" });
}

export async function storeOpenAIKey(openaiApiKey: string) {
  return request<Record<string, unknown>>(
    "/ai/keys/openai",
    { method: "POST", body: JSON.stringify({ openai_api_key: openaiApiKey }) },
    true
  );
}

export async function deleteOpenAIKey() {
  return request<Record<string, unknown>>("/ai/keys/openai", { method: "DELETE" }, true);
}

export async function generateAiCv(payload: {
  target_role?: string;
  translate_to_chinese?: boolean;
  openai_api_key?: string;
  use_stored_key?: boolean;
  store_key?: boolean;
}) {
  return request<{ cv_markdown: string; export: Record<string, unknown> }>(
    "/ai/cv/generate",
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

export async function sendAiChat(payload: { message: string; locale?: string; context?: Record<string, unknown> }) {
  return request<{ reply: string; locale: string; stub: boolean }>(
    "/ai/chat",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export async function exportCandidateProfileForLlm() {
  return request<Record<string, unknown>>("/ai/export/candidate-profile", { method: "GET" }, true);
}

export async function exportJobForLlm(jobId: string) {
  return request<Record<string, unknown>>(`/ai/export/jobs/${jobId}`, { method: "GET" });
}

export async function fetchArchiveStatus(trackingDays = 90, applicationDays = 180) {
  return request<Record<string, number>>(
    `/admin/archive/status?tracking_days=${trackingDays}&application_days=${applicationDays}`,
    { method: "GET" },
    true
  );
}

export async function runArchiveNow(payload: { tracking_days: number; application_days: number }) {
  return request<Record<string, number>>("/admin/archive/run", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function presignUpload(payload: Record<string, unknown>) {
  return request<{
    upload_url: string;
    method: string;
    headers: Record<string, string>;
    asset: { id: string; objectKey: string };
    public_url: string | null;
  }>("/media/presign", { method: "POST", body: JSON.stringify(payload) }, true);
}

export async function uploadFileToSignedUrl(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (progress: number) => void
) {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error("Upload failed. Check the storage bucket CORS policy and try again."));
      }
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "Direct upload blocked. Configure Cloudflare R2 bucket CORS to allow your web origin (for local dev: http://localhost:3000)."
        )
      );
    xhr.send(file);
  });
}
