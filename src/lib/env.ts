import { z } from "zod";

const publicSupabaseSchema = z.object({
  url: z.url(),
  anonKey: z.string().min(20),
});

export type SupabasePublicEnv = z.infer<typeof publicSupabaseSchema>;

export function hasSupabasePublicEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const result = publicSupabaseSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    throw new Error(
      "Supabase environment is not configured. Copy .env.example to .env.local and add the project URL and anon key.",
    );
  }

  return result.data;
}
