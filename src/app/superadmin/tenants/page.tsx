import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Filter, Plus } from "lucide-react";
import { CenterManagementList } from "@/components/centers/CenterManagementList";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { CenterRecord, CenterStatus } from "@/types/center";

export const metadata: Metadata = { title: "কেন্দ্র ব্যবস্থাপনা" };

const filters: { value: "all" | CenterStatus; label: string }[] = [
  { value: "all", label: "সব" }, { value: "pending", label: "অপেক্ষমাণ" },
  { value: "active", label: "সক্রিয়" }, { value: "suspended", label: "স্থগিত" },
  { value: "blocked", label: "অবরুদ্ধ" },
];

type CenterRow = {
  id: string; code: string; name: string; location_type: CenterRecord["locationType"];
  division: string; district: string; upazila: string; union_or_ward: string | null;
  address: string; phone: string; email: string | null; license_number: string | null;
  license_expires_at: string | null; status: CenterStatus; created_at: string;
};

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole(["super_admin"]);
  const params = await searchParams;
  const selected = filters.find((item) => item.value === params.status) ?? filters[0];
  const supabase = await createClient();
  let query = supabase.from("centers").select("*").order("created_at", { ascending: false }).limit(100);
  if (selected.value !== "all") query = query.eq("status", selected.value);
  const { data } = await query;
  const centers: CenterRecord[] = ((data ?? []) as CenterRow[]).map((row) => ({ id: row.id, code: row.code, name: row.name, locationType: row.location_type, division: row.division, district: row.district, upazila: row.upazila, unionOrWard: row.union_or_ward, address: row.address, phone: row.phone, email: row.email, licenseNumber: row.license_number, licenseExpiresAt: row.license_expires_at, status: row.status, createdAt: row.created_at }));

  return <div><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-xs font-bold text-brand"><Building2 className="size-4" /> Tenant lifecycle</div><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">কেন্দ্র ব্যবস্থাপনা</h1><p className="mt-2 text-sm text-muted">কেন্দ্র তৈরি, অনুমোদন, স্থগিত, block ও পুনরায় সক্রিয় করুন।</p></div><Link href="/superadmin/tenants/new" className="flex h-11 w-fit items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white"><Plus className="size-4" /> নতুন কেন্দ্র</Link></div><div className="mb-5 flex flex-wrap items-center gap-2"><span className="mr-1 flex items-center gap-1 text-[10px] font-bold text-muted"><Filter className="size-3.5" /> Filter</span>{filters.map((filter) => <Link key={filter.value} href={filter.value === "all" ? "/superadmin/tenants" : `/superadmin/tenants?status=${filter.value}`} className={`rounded-lg px-3 py-2 text-[10px] font-bold ${selected.value === filter.value ? "bg-brand text-white" : "border border-border bg-white text-muted"}`}>{filter.label}</Link>)}</div><CenterManagementList centers={centers} /></div>;
}
