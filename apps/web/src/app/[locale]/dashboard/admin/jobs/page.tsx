"use client";
import dynamic from "next/dynamic";
const Section = dynamic(() => import("@/components/admin/AdminJobsSection").then((m) => m.AdminJobsSection), { ssr: false, loading: () => null });
export default function AdminJobsPage() { return <Section />; }
