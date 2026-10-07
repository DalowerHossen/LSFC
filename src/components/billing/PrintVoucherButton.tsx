"use client";
import { Printer } from "lucide-react";
export function PrintVoucherButton(){return <button type="button" onClick={()=>window.print()} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-xs font-bold text-white print:hidden"><Printer className="size-4"/> Voucher print করুন</button>}
