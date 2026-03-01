"use client";
import dynamic from "next/dynamic";
const Section = dynamic(() => import("@/components/admin/AdminTaxonomySection").then((m) => m.AdminTaxonomySection), { ssr: false, loading: () => null });
export default function AdminTaxonomyPage() { return <Section />; }
