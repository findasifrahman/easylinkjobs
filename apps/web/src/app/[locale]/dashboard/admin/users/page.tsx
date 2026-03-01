"use client";
import dynamic from "next/dynamic";
const Section = dynamic(() => import("@/components/admin/AdminUsersSection").then((m) => m.AdminUsersSection), { ssr: false, loading: () => null });
export default function AdminUsersPage() { return <Section />; }
