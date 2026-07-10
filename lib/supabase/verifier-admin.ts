import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "./server";
import { createAdminClient } from "./admin";

const ROLES_ADMINISTRATEURS = [
  "super_admin",
  "admin_provincial",
] as const;

type ResultatAuth =
  | { userId: string; erreur: null }
  | { userId: null; erreur: NextResponse };

/**
 * Vérifie que l'utilisateur est authentifié ET qu'il possède un rôle
 * administrateur (super_admin ou admin_provincial).
 *
 * À utiliser dans toutes les routes API sensibles de gestion.
 */
export async function verifierRoleAdmin(): Promise<ResultatAuth> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      erreur: NextResponse.json(
        { succes: false, message: "Vous devez être connecté." },
        { status: 401 },
      ),
    };
  }

  const supabaseAdmin = createAdminClient();
  const { data: profil } = await supabaseAdmin
    .from("profils")
    .select("role, statut")
    .eq("id", user.id)
    .maybeSingle();

  const estAdmin =
    profil &&
    profil.statut === "actif" &&
    ROLES_ADMINISTRATEURS.includes(
      profil.role as (typeof ROLES_ADMINISTRATEURS)[number],
    );

  if (!estAdmin) {
    return {
      userId: null,
      erreur: NextResponse.json(
        {
          succes: false,
          message: "Cette action est réservée aux administrateurs.",
        },
        { status: 403 },
      ),
    };
  }

  return { userId: user.id, erreur: null };
}
