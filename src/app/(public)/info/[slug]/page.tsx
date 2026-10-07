import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/common/PublicHeader";
import { PublicCmsBlocks } from "@/components/content/PublicCmsBlocks";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
export const metadata:Metadata={title:"তথ্য"};
export default async function InfoPage({params}:{params:Promise<{slug:string}>}){if(!hasSupabasePublicEnv())notFound();const{slug}=await params;if(!/^[a-z0-9-]{2,60}$/.test(slug))notFound();const{data}=await(await createClient()).from("cms_pages").select("title,content,blocks,updated_at").eq("slug",slug).eq("status","published").maybeSingle();if(!data)notFound();return <><PublicHeader/><main className="min-h-[calc(100vh-72px)] bg-[#f3f7f5] px-5 py-12"><article className="mx-auto max-w-3xl rounded-3xl border border-border bg-white p-7 shadow-sm sm:p-10"><h1 className="text-2xl font-extrabold sm:text-3xl">{data.title}</h1><p className="mt-2 text-[10px] text-muted">সর্বশেষ হালনাগাদ: {new Intl.DateTimeFormat("bn-BD",{dateStyle:"long",timeZone:"Asia/Dhaka"}).format(new Date(data.updated_at))}</p><div className="mt-8"><PublicCmsBlocks blocks={data.blocks} legacy={data.content}/></div></article></main></>}
