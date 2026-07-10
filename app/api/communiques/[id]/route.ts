import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";

function reponseErreur(message: string, statut: number) {
  return NextResponse.json({ succes: false, message }, { status: statut });
}

async function verifierAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/*
 * PATCH /api/communiques/[id]
 * Mise à jour d'un communiqué (statut, contenu, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await verifierAdmin();

  if (!user) {
    return reponseErreur("Vous devez être connecté.", 401);
  }

  const { id } = await params;

  let corps: Record<string, unknown>;

  try {
    corps = (await request.json()) as Record<string, unknown>;
  } catch {
    return reponseErreur("Données invalides.", 400);
  }

  const supabaseAdmin = createAdminClient();

  const miseAJour: Record<string, unknown> = {};

  if (corps.titre !== undefined) miseAJour.titre = corps.titre;
  if (corps.categorie !== undefined) miseAJour.categorie = corps.categorie;
  if (corps.resume !== undefined) miseAJour.resume = corps.resume;
  if (corps.contenu !== undefined) miseAJour.contenu = corps.contenu;
  if (corps.datePublication !== undefined)
    miseAJour.date_publication = corps.datePublication || null;
  if (corps.reference !== undefined) miseAJour.reference = corps.reference;
  if (corps.image !== undefined) miseAJour.image = corps.image;
  if (corps.statut !== undefined) miseAJour.statut = corps.statut;

  const { data, error } = await supabaseAdmin
    .from("communiques")
    .update(miseAJour)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return reponseErreur("Impossible de mettre à jour le communiqué.", 500);
  }

  return NextResponse.json({ succes: true, communique: data });
}

/*
 * DELETE /api/communiques/[id]
 * Suppression d'un communiqué.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await verifierAdmin();

  if (!user) {
    return reponseErreur("Vous devez être connecté.", 401);
  }

  const { id } = await params;

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("communiques")
    .delete()
    .eq("id", id);

  if (error) {
    return reponseErreur("Impossible de supprimer le communiqué.", 500);
  }

  return NextResponse.json({ succes: true });
}
