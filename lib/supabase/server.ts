import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
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

  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                cookieStore.set(
                  name,
                  value,
                  options,
                );
              },
            );
          } catch {
            /*
             * Cette erreur peut arriver lorsque le client
             * est utilisé dans un Server Component.
             * Le futur fichier proxy.ts actualisera
             * automatiquement les sessions.
             */
          }
        },
      },
    },
  );
}