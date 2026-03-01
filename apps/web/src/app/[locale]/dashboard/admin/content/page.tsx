"use client";
import dynamic from "next/dynamic";
const Section = dynamic(() => import("@/components/admin/AdminContentSection").then((m) => m.AdminContentSection), { ssr: false, loading: () => null });
export default function AdminContentPage() { return <Section />; }
