"use client";
import dynamic from "next/dynamic";
const Section = dynamic(() => import("@/components/admin/AdminTrackingSection").then((m) => m.AdminTrackingSection), { ssr: false, loading: () => null });
export default function AdminTrackingPage() { return <Section />; }
