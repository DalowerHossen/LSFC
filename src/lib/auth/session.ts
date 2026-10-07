import "server-only";

import { redirect } from "next/navigation";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  isUserRole,
  ROLE_HOME,
  type AssuranceLevel,
  type AuthContext,
  type UserRole,
} from "@/types/auth";

export async function getAuthContext(): Promise<AuthContext | null> {
  if (!hasSupabasePublicEnv()) return null;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, center_id, role, full_name, is_active")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    !isUserRole(profile.role) ||
    (profile.role !== "super_admin" && !profile.center_id)
  ) {
    return null;
  }

  const centerPromise = profile.center_id
    ? supabase
        .from("centers")
        .select("name, status, operator_2fa_required")
        .eq("id", profile.center_id)
        .single()
    : Promise.resolve({ data: null, error: null });

  const [centerResult, factorsResult, assuranceResult] = await Promise.all([
    centerPromise,
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  const hasVerifiedTotp = Boolean(
    !factorsResult.error &&
      factorsResult.data?.totp.some((factor) => factor.status === "verified"),
  );

  const operatorMfaRequired = Boolean(
    centerResult.data?.operator_2fa_required,
  );
  const mfaRequired =
    profile.role === "super_admin" ||
    profile.role === "owner" ||
    (profile.role === "operator" && operatorMfaRequired);

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    role: profile.role,
    centerId: profile.center_id,
    centerName: centerResult.data?.name ?? null,
    centerStatus: centerResult.data?.status ?? null,
    mfaRequired,
    hasVerifiedTotp,
    currentAssuranceLevel: (assuranceResult.data?.currentLevel ??
      null) as AssuranceLevel,
    nextAssuranceLevel: (assuranceResult.data?.nextLevel ??
      null) as AssuranceLevel,
  };
}

export function getMfaStep(context: AuthContext): "/2fa-setup" | "/2fa-verify" | null {
  if (!context.mfaRequired) return null;
  if (!context.hasVerifiedTotp) return "/2fa-setup";
  if (context.currentAssuranceLevel !== "aal2") return "/2fa-verify";
  return null;
}

export async function requireRole(
  allowedRoles: readonly UserRole[],
  options: { allowInactiveCenter?: boolean } = {},
): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context) redirect("/login");

  if (!allowedRoles.includes(context.role)) {
    redirect(ROLE_HOME[context.role]);
  }

  const mfaStep = getMfaStep(context);
  if (mfaStep) redirect(mfaStep);

  if (
    !options.allowInactiveCenter &&
    context.role !== "super_admin" &&
    context.centerStatus !== "active"
  ) {
    redirect("/center-status");
  }

  return context;
}
