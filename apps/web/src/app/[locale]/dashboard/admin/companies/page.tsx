"use client";
import dynamic from "next/dynamic";
const Section = dynamic(() => import("@/components/admin/AdminCompaniesSection").then((m) => m.AdminCompaniesSection), { ssr: false, loading: () => null });
export default function AdminCompaniesPage() { return <Section />; }
