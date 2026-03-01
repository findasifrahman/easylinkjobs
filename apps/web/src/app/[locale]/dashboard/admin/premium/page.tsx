"use client";
import dynamic from "next/dynamic";
const Section = dynamic(() => import("@/components/admin/AdminPremiumSection").then((m) => m.AdminPremiumSection), { ssr: false, loading: () => null });
export default function AdminPremiumPage() { return <Section />; }
