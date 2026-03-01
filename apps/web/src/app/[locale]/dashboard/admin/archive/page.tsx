"use client";
import dynamic from "next/dynamic";
const Section = dynamic(() => import("@/components/admin/AdminArchiveSection").then((m) => m.AdminArchiveSection), { ssr: false, loading: () => null });
export default function AdminArchivePage() { return <Section />; }
