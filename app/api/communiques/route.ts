import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";

function reponseErreur(message: string, statut: number) {
  return NextResponse.json({ succes: false, message }, { status: statut });
}

/*
 * GET /api/communiques
 * Lecture publique — retourne uniquement les communiqués publiés.
 */
export async function GET() {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("communiques")
    .select("*")
    .eq("statut", "Publié")
    .order("date_publication", { ascending: false });

  if (error) {
    return reponseErreur("Impossible de charger les communiqués.", 500);
  }

  return NextResponse.json({ succes: true, communiques: data ?? [] });
}

/*
 * POST /api/communiques
 * Création d'un communiqué — réservé aux utilisateurs authentifiés.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return reponseErreur("Vous devez être connecté.", 401);
  }

  let corps: Record<string, unknown>;

  try {
    corps = (await request.json()) as Record<string, unknown>;
  } catch {
    return reponseErreur("Données invalides.", 400);
  }

  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("communiques")
    .insert({
      titre: corps.titre,
      categorie: corps.categorie,
      resume: corps.resume,
      contenu: corps.contenu,
      date_publication: corps.datePublication || null,
      reference: corps.reference,
      image: corps.image,
      statut: corps.statut ?? "Brouillon",
    })
    .select()
    .single();

  if (error) {
    return reponseErreur("Impossible de créer le communiqué.", 500);
  }

  return NextResponse.json({ succes: true, communique: data }, { status: 201 });
}
