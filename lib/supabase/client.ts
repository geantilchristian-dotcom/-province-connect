import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "La variable NEXT_PUBLIC_SUPABASE_URL est absente.",
    );
  }

  if (!supabasePublishableKey) {
    throw new Error(
      "La variable NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY est absente.",
    );
  }

  return createBrowserClient(
    supabaseUrl,
    supabasePublishableKey,
  );
}