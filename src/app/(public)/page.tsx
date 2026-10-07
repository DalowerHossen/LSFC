import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BellRing,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CloudOff,
  FileCheck2,
  FileText,
  Fingerprint,
  Headphones,
  LandPlot,
  LockKeyhole,
  Map,
  MapPinned,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  UsersRound,
} from "lucide-react";
import { GovernmentMark } from "@/components/common/GovernmentMark";
import { PublicHeader } from "@/components/common/PublicHeader";
import { PublicCmsBlocks } from "@/components/content/PublicCmsBlocks";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const services = [
  {
    title: "ভূমি উন্নয়ন কর",
    description: "নিবন্ধন, কর প্রদান ও দাখিলার প্রিন্ট কপি সহজে পরিচালনা করুন।",
    icon: LandPlot,
  },
  {
    title: "ই-নামজারি আবেদন",
    description: "নামজারি আবেদন, প্রয়োজনীয় কাগজপত্র ও ফি এক জায়গায়।",
    icon: FileCheck2,
  },
  {
    title: "খতিয়ান ও পর্চা",
    description: "রেকর্ডীয় খতিয়ান বা পর্চার আবেদন ও অগ্রগতি পর্যবেক্ষণ।",
    icon: FileText,
  },
  {
    title: "মৌজা ম্যাপ",
    description: "মৌজা ম্যাপের আবেদন, ফি, গ্রহণ ও বিতরণ ব্যবস্থাপনা।",
    icon: Map,
  },
  {
    title: "সম্পত্তি ও লিজ",
    description: "অর্পিত, পরিত্যক্ত সম্পত্তি ও সায়রাত মহালের আবেদন।",
    icon: MapPinned,
  },
  {
    title: "অন্যান্য ভূমিসেবা",
    description: "কবুলিয়ত, মিসকেসসহ সরকার অনুমোদিত অন্যান্য অনলাইন সেবা।",
    icon: ClipboardCheck,
  },
];

const process = [
  {
    step: "০১",
    title: "কেন্দ্রে আবেদন",
    description: "নিকটস্থ সহায়তা কেন্দ্রে প্রয়োজনীয় তথ্য ও কাগজপত্র দিন।",
  },
  {
    step: "০২",
    title: "স্বচ্ছ ফি ও রশিদ",
    description: "অবস্থান ও সেবাভিত্তিক নির্ধারিত ফি দিয়ে QR-যুক্ত রশিদ নিন।",
  },
  {
    step: "০৩",
    title: "অগ্রগতি জানুন",
    description: "ট্র্যাকিং নম্বর দিয়ে যেকোনো সময় আবেদনের অবস্থা দেখুন।",
  },
];

const assurances = [
  "প্রতিটি কেন্দ্রের তথ্য সম্পূর্ণ আলাদা",
  "সংবেদনশীল নথির নিরাপদ সংরক্ষণ",
  "প্রতিটি কার্যক্রমের নিরীক্ষাযোগ্য রেকর্ড",
  "সংযোগ বিচ্ছিন্ন হলে নিরাপদ অফলাইন ফলব্যাক",
];

export default async function HomePage() {
  const homeContent=hasSupabasePublicEnv()?await(await createClient()).from("cms_pages").select("title,blocks").eq("slug","home").eq("status","published").maybeSingle():{data:null};
  return (
    <main className="overflow-hidden">
      <PublicHeader />
      {homeContent.data&&Array.isArray(homeContent.data.blocks)&&homeContent.data.blocks.length>0&&<section className="border-b border-border bg-brand-soft/30 px-5 py-8"><div className="mx-auto max-w-4xl rounded-2xl border border-brand/10 bg-white p-6 shadow-sm"><p className="mb-4 text-xs font-bold text-brand">{homeContent.data.title}</p><PublicCmsBlocks blocks={homeContent.data.blocks}/></div></section>}

      <section className="relative border-b border-border bg-white pt-16 pb-20 sm:pt-20 lg:pt-24 lg:pb-28">
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -top-28 right-[-10rem] size-[32rem] rounded-full bg-brand-soft/70 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
          <div className="fade-up max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-soft px-3.5 py-2 text-xs font-bold text-brand sm:text-sm">
              <BadgeCheck className="size-4" aria-hidden="true" />
              ডিজিটাল, স্বচ্ছ ও নাগরিকবান্ধব ভূমিসেবা
            </div>
            <h1 className="text-[2.6rem] leading-[1.18] font-extrabold tracking-[-0.035em] text-foreground sm:text-6xl lg:text-[4.15rem]">
              ভূমিসেবা ব্যবস্থাপনা,
              <span className="mt-2 block text-brand">এখন আরও সহজ</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-muted sm:text-lg sm:leading-9">
              নাগরিক আবেদন থেকে রশিদ, হিসাব ও সরকারি প্রতিবেদন—ভূমিসেবা
              সহায়তা কেন্দ্রের প্রতিদিনের কার্যক্রম পরিচালনার জন্য একটি নিরাপদ
              ও সমন্বিত প্ল্যাটফর্ম।
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/track"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/15 transition hover:-translate-y-0.5 hover:bg-brand-dark"
              >
                আবেদন ট্র্যাক করুন
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="#services"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 py-3.5 text-sm font-bold text-foreground transition hover:border-brand/30 hover:bg-brand-soft/50"
              >
                সব সেবা দেখুন
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-muted">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-brand" /> বাংলা ইন্টারফেস
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-brand" /> QR যাচাই
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-brand" /> নিরাপদ অফলাইন ফলব্যাক
              </span>
            </div>
          </div>

          <div className="fade-up-delay relative mx-auto w-full max-w-[590px] lg:mx-0">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-brand/10 via-transparent to-accent/10 blur-2xl" />
            <div className="ড্যাশবোর্ড-shadow relative overflow-hidden rounded-[1.6rem] border border-border bg-white p-2">
              <div className="overflow-hidden rounded-[1.15rem] border border-border bg-[#f5f8f6]">
                <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3.5 sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="grid size-8 place-items-center rounded-lg bg-brand text-xs font-bold text-white">
                      ভূ
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground sm:text-sm">
                        কেন্দ্র ড্যাশবোর্ড
                      </p>
                      <p className="mt-0.5 text-[9px] text-muted sm:text-[10px]">
                        ড্যাশবোর্ডের নমুনা
                      </p>
                    </div>
                  </div>
                  <BellRing className="size-4 text-muted" />
                </div>

                <div className="grid grid-cols-[68px_1fr] sm:grid-cols-[106px_1fr]">
                  <aside className="border-r border-border bg-white p-2.5 sm:p-3">
                    {["সারাংশ", "আবেদন", "হিসাব", "রিপোর্ট"].map(
                      (item, index) => (
                        <div
                          key={item}
                          className={`mb-2 rounded-md px-2 py-2 text-[8px] font-semibold sm:text-[10px] ${
                            index === 0
                              ? "bg-brand-soft text-brand"
                              : "text-muted"
                          }`}
                        >
                          {item}
                        </div>
                      ),
                    )}
                  </aside>
                  <div className="p-3 sm:p-5">
                    <div className="mb-4 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-muted sm:text-xs">
                          স্বাগতম
                        </p>
                        <p className="mt-1 text-xs font-bold sm:text-sm">
                          আজকের কার্যক্রম
                        </p>
                      </div>
                      <span className="rounded-md bg-white px-2 py-1 text-[8px] font-medium text-muted sm:text-[9px]">
                        আজ
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {[
                        ["২৪", "মোট আবেদন", FileText],
                        ["১৬", "সম্পন্ন", CheckCircle2],
                        ["০৮", "চলমান", Smartphone],
                      ].map(([value, label, Icon]) => {
                        const DashboardIcon = Icon as typeof FileText;
                        return (
                          <div
                            key={label as string}
                            className="rounded-lg border border-border bg-white p-2.5 sm:rounded-xl sm:p-3.5"
                          >
                            <DashboardIcon className="mb-3 size-3.5 text-brand sm:size-4" />
                            <p className="text-base font-extrabold sm:text-xl">
                              {value as string}
                            </p>
                            <p className="mt-1 text-[7px] text-muted sm:text-[9px]">
                              {label as string}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 rounded-lg border border-border bg-white p-3 sm:mt-4 sm:rounded-xl sm:p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-[9px] font-bold sm:text-[11px]">
                          সাপ্তাহিক আবেদন
                        </p>
                        <p className="text-[8px] font-semibold text-brand">
                          +১২.৫%
                        </p>
                      </div>
                      <div className="flex h-20 items-end gap-2 sm:h-24 sm:gap-3">
                        {[42, 58, 48, 74, 62, 86, 68].map((height, index) => (
                          <div
                            key={index}
                            className="flex flex-1 flex-col items-center gap-1.5"
                          >
                            <div
                              className={`w-full rounded-t-sm ${
                                index === 5 ? "bg-brand" : "bg-brand/15"
                              }`}
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-[6px] text-muted sm:text-[7px]">
                              {["শ", "ম", "বু", "বৃ", "শু", "শ", "র"][index]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-3 -bottom-5 hidden items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-xl sm:flex">
              <div className="grid size-9 place-items-center rounded-full bg-brand-soft text-brand">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted">তথ্য সুরক্ষা</p>
                <p className="text-xs font-bold">নিরাপদ ও নিরীক্ষাযোগ্য</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-[#f4f8f6] py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-5 sm:px-8 lg:grid-cols-4">
          {[
            ["১৪টি", "সরকার অনুমোদিত সেবা"],
            ["৩ স্তর", "অবস্থানভিত্তিক ফি"],
            ["২৪/৭", "আবেদন ট্র্যাকিং"],
            ["১০০%", "বাংলা ইন্টারফেস"],
          ].map(([value, label]) => (
            <div key={label} className="text-center lg:border-r lg:border-border last:border-0">
              <p className="text-2xl font-extrabold text-brand sm:text-3xl">{value}</p>
              <p className="mt-1 text-xs font-medium text-muted sm:text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="services" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold text-brand">সমন্বিত সেবা ব্যবস্থাপনা</p>
            <h2 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
              নাগরিকের প্রয়োজনীয় ভূমিসেবা
              <span className="block text-brand">একই প্ল্যাটফর্মে</span>
            </h2>
            <p className="mt-5 text-sm leading-7 text-muted sm:text-base">
              সঠিক ফি, ডিজিটাল রশিদ ও আবেদনের অগ্রগতি—প্রতিটি ধাপে স্বচ্ছতা।
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.title}
                className="group rounded-2xl border border-border bg-white p-6 transition hover:-translate-y-1 hover:border-brand/25 hover:shadow-xl hover:shadow-brand/5"
              >
                <div className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                  <service.icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-bold">{service.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{service.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand">
                  বিস্তারিত জানুন <ArrowLeft className="size-4" />
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="process" className="border-y border-border bg-[#f4f8f6] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <p className="text-sm font-bold text-brand">সহজ তিনটি ধাপ</p>
              <h2 className="mt-3 max-w-md text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
                আবেদন থেকে সেবা গ্রহণ পর্যন্ত
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-muted sm:text-base">
                জটিলতা কমিয়ে প্রতিটি ধাপে নাগরিককে পরিষ্কার তথ্য ও নির্ভরযোগ্য সহায়তা দেওয়ার পরিকল্পনা।
              </p>
            </div>
            <div className="grid gap-4">
              {process.map((item, index) => (
                <article
                  key={item.step}
                  className="grid grid-cols-[54px_1fr] gap-4 rounded-2xl border border-border bg-white p-5 sm:grid-cols-[70px_1fr] sm:gap-6 sm:p-7"
                >
                  <div className="grid size-12 place-items-center rounded-xl bg-brand text-sm font-extrabold text-white sm:size-14">
                    {item.step}
                  </div>
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold sm:text-xl">{item.title}</h3>
                      {index < process.length - 1 && (
                        <span className="hidden rounded-full bg-brand-soft px-3 py-1 text-[10px] font-bold text-brand sm:block">
                          পরবর্তী ধাপ
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-muted">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="security" className="bg-white py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
          <div className="relative rounded-3xl bg-brand p-6 text-white sm:p-9">
            <div className="absolute top-0 right-0 size-52 rounded-full bg-white/10 blur-3xl" />
            <div className="relative grid gap-3 sm:grid-cols-2">
              {[
                [Fingerprint, "নিরাপদ প্রবেশ", "দ্বি-ধাপ যাচাইয়ের প্রস্তুতি"],
                [LockKeyhole, "তথ্য পৃথকীকরণ", "কেন্দ্রভিত্তিক ডেটা সুরক্ষা"],
                [CloudOff, "অফলাইন কাজ", "দুর্বল ইন্টারনেটেও প্রস্তুত"],
                [QrCode, "QR যাচাই", "রশিদের সত্যতা নিশ্চিতকরণ"],
              ].map(([Icon, title, text]) => {
                const SecurityIcon = Icon as typeof Fingerprint;
                return (
                  <div key={title as string} className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                    <SecurityIcon className="size-6 text-white" />
                    <p className="mt-6 text-sm font-bold sm:text-base">{title as string}</p>
                    <p className="mt-2 text-xs leading-6 text-white/65">{text as string}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-brand">নিরাপত্তা ও জবাবদিহি</p>
            <h2 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
              নাগরিকের তথ্য সুরক্ষায় পরিকল্পিত প্রতিটি স্তর
            </h2>
            <p className="mt-5 text-sm leading-7 text-muted sm:text-base">
              কেন্দ্রভিত্তিক তথ্য পৃথকীকরণ, অনুমতিনির্ভর প্রবেশ এবং নিরীক্ষাযোগ্য কার্যক্রমের মাধ্যমে একটি বিশ্বস্ত সেবা পরিবেশ।
            </p>
            <ul className="mt-7 grid gap-4">
              {assurances.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-semibold text-foreground">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="launch" className="bg-white px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#102b23] px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <div className="absolute -top-24 -left-20 size-64 rounded-full bg-brand/60 blur-3xl" />
          <div className="absolute -right-20 -bottom-28 size-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <ReceiptText className="mx-auto size-9 text-[#74d3b3]" />
            <h2 className="mt-5 text-2xl font-extrabold sm:text-4xl">
              আপনার আবেদন এখনই ট্র্যাক করুন
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/65 sm:text-base">
              রশিদে থাকা ট্র্যাকিং আইডি এবং মোবাইল নম্বর দিয়ে নিরাপদে আবেদনের বর্তমান অবস্থা জানুন।
            </p>
            <Link href="/track" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#102b23] transition hover:bg-[#dff4ec]">
              আবেদন ট্র্যাক করুন <ArrowLeft className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer id="support" className="border-t border-white/10 bg-[#0b211b] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.3fr_.7fr_.7fr]">
          <div className="max-w-sm">
            <GovernmentMark inverse />
            <p className="mt-5 text-sm leading-7 text-white/55">
              ভূমিসেবা সহায়তা কেন্দ্রের জন্য নিরাপদ, স্বচ্ছ ও সমন্বিত ডিজিটাল ব্যবস্থাপনা।
            </p>
          </div>
          <div>
            <p className="text-sm font-bold">গুরুত্বপূর্ণ লিংক</p>
            <div className="mt-4 flex flex-col gap-3 text-xs text-white/55">
              <Link href="/services" className="hover:text-white">সেবা ও ফি</Link>
              <Link href="/info/about" className="hover:text-white">আমাদের সম্পর্কে</Link>
              <Link href="/info/faq" className="hover:text-white">সাধারণ জিজ্ঞাসা</Link>
              <Link href="/info/user-guide" className="hover:text-white">ব্যবহার নির্দেশিকা</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">সহায়তা</p>
            <div className="mt-4 flex flex-col gap-3 text-xs text-white/55">
              <Link href="/info/contact" className="flex items-center gap-2 hover:text-white"><Headphones className="size-4" /> যোগাযোগ</Link>
              <Link href="/info/privacy" className="flex items-center gap-2 hover:text-white"><ShieldCheck className="size-4" /> গোপনীয়তা নীতি</Link>
              <Link href="/info/terms" className="flex items-center gap-2 hover:text-white"><UsersRound className="size-4" /> ব্যবহারের শর্তাবলি</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-[11px] text-white/40 sm:px-8">
          © {new Date().getFullYear()} ভূমিসেবা সহায়তা Center ব্যবস্থাপনা সিস্টেম
        </div>
      </footer>
    </main>
  );
}
