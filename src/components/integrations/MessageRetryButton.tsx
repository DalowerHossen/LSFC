"use client";

import { useActionState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { retryDeadLetterMessageAction, type MessageRetryState } from "@/app/superadmin/message-delivery/actions";

const initialState: MessageRetryState = {};

export function MessageRetryButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(retryDeadLetterMessageAction, initialState);
  return <form action={action} className="mt-3">
    <input type="hidden" name="messageId" value={id} />
    <button type="submit" disabled={pending} className="flex h-9 items-center gap-2 rounded-lg bg-brand px-3 text-[10px] font-bold text-white disabled:opacity-60">
      {pending ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
      পুনরায় সারিতে রাখুন
    </button>
    <p aria-live="polite" className={`mt-2 text-[9px] ${state.error ? "text-red-700" : "text-emerald-700"}`}>{state.error ?? state.success}</p>
  </form>;
}
