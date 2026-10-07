"use client";

import { useActionState } from "react";
import { CheckCircle2, LoaderCircle, Play } from "lucide-react";
import { transitionApplicationAction } from "@/app/operator/applications/actions";
import type { ApplicationStatus, WorkflowActionState } from "@/types/application";

const initialState: WorkflowActionState = {};

export function StatusActionButton({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: ApplicationStatus;
}) {
  const [state, formAction, pending] = useActionState(
    transitionApplicationAction,
    initialState,
  );

  const targetStatus =
    currentStatus === "submitted"
      ? "in_progress"
      : currentStatus === "in_progress"
        ? "completed"
        : null;

  if (!targetStatus) return null;

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="targetStatus" value={targetStatus} />
        <button
          type="submit"
          disabled={pending}
          className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
            targetStatus === "completed"
              ? "bg-brand text-white hover:bg-brand-dark"
              : "border border-brand/20 bg-brand-soft text-brand hover:bg-brand hover:text-white"
          }`}
        >
          {pending ? (
            <><LoaderCircle className="size-4 animate-spin" /> Update হচ্ছে…</>
          ) : targetStatus === "completed" ? (
            <><CheckCircle2 className="size-4" /> সেবা সম্পন্ন করুন</>
          ) : (
            <><Play className="size-4" /> কাজ শুরু করুন</>
          )}
        </button>
      </form>
      {state.error && (
        <p role="alert" className="mt-2 max-w-xs text-[10px] leading-4 text-red-700">
          {state.error}
        </p>
      )}
    </div>
  );
}
