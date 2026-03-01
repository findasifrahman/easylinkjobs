"use client";
import dynamic from "next/dynamic";
const AdminOverviewSection = dynamic(() => import("@/components/admin/AdminOverviewSection").then((m) => m.AdminOverviewSection), { ssr: false, loading: () => null });
export default function AdminDashboardPage() { return <AdminOverviewSection />; }
