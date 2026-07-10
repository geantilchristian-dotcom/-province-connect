import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

function reponseErreur(message: string, statut: number) {
  return NextResponse.json({ succes: false, message }, { status: statut });
}

function nettoyerTexte(valeur: unknown, max: number): string {
  if (typeof valeur !== "string") return "";
  return valeur.trim().slice(0, max);
}

/*
 * POST /api/notifications/subscribe-public
 *
 * Enregistre un abonnement push pour un visiteur anonyme (sans compte).
 * Aucune authentification requise.
 */
export async function POST(request: NextRequest) {
  let corps: {
    endpoint?: unknown;
    p256dh?: unknown;
    auth?: unknown;
  };

  try {
    corps = (await request.json()) as typeof corps;
  } catch {
    return reponseErreur("Données invalides.", 400);
  }

  const endpoint = nettoyerTexte(corps.endpoint, 4000);
  const p256dh = nettoyerTexte(corps.p256dh, 1000);
  const authKey = nettoyerTexte(corps.auth, 500);

  if (!endpoint || !p256dh || !authKey) {
    return reponseErreur("Abonnement incomplet.", 400);
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("push_subscriptions_public")
    .upsert(
      { endpoint, p256dh, auth_key: authKey },
      { onConflict: "endpoint" },
    );

  if (error) {
    return reponseErreur("Impossible d'enregistrer l'abonnement.", 500);
  }

  return NextResponse.json({
    succes: true,
    message: "Abonnement aux notifications activé.",
  });
}

/*
 * DELETE /api/notifications/subscribe-public
 *
 * Supprime un abonnement push public (désabonnement).
 */
export async function DELETE(request: NextRequest) {
  let corps: { endpoint?: unknown };

  try {
    corps = (await request.json()) as typeof corps;
  } catch {
    return reponseErreur("Données invalides.", 400);
  }

  const endpoint = nettoyerTexte(corps.endpoint, 4000);

  if (!endpoint) {
    return reponseErreur("Endpoint manquant.", 400);
  }

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("push_subscriptions_public")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    return reponseErreur("Impossible de supprimer l'abonnement.", 500);
  }

  return NextResponse.json({ succes: true });
}
