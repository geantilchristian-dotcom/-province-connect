import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";

function reponseErreur(message: string, statut: number) {
  return NextResponse.json({ succes: false, message }, { status: statut });
}

type AbonnementPush = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/*
 * POST /api/notifications/broadcast
 *
 * Envoie une notification push à tous les abonnés (publics + employés).
 * Réservé aux utilisateurs authentifiés (admin).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return reponseErreur("Vous devez être connecté.", 401);
  }

  const clePublique = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const clePrivee = process.env.VAPID_PRIVATE_KEY;
  const emailVapid = process.env.VAPID_EMAIL ?? "mailto:admin@province-connect.app";

  if (!clePublique || !clePrivee) {
    return reponseErreur("Clés VAPID non configurées.", 500);
  }

  webpush.setVapidDetails(emailVapid, clePublique, clePrivee);

  let corps: {
    titre?: unknown;
    body?: unknown;
    url?: unknown;
    tag?: unknown;
  };

  try {
    corps = (await request.json()) as typeof corps;
  } catch {
    return reponseErreur("Données invalides.", 400);
  }

  const payloadNotification = JSON.stringify({
    title: typeof corps.titre === "string" ? corps.titre : "Province Connect",
    body: typeof corps.body === "string" ? corps.body : "Un nouveau communiqué a été publié.",
    url: typeof corps.url === "string" ? corps.url : "/",
    tag: typeof corps.tag === "string" ? corps.tag : "province-connect-communique",
    icon: "/favicon.ico",
    renotify: true,
  });

  const supabaseAdmin = createAdminClient();

  // Récupérer tous les abonnés publics (visiteurs anonymes)
  const { data: abonnesPublics } = await supabaseAdmin
    .from("push_subscriptions_public")
    .select("endpoint, p256dh, auth_key");

  // Récupérer tous les abonnés authentifiés (employés)
  const { data: abonnesEmployes } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key");

  const tousLesAbonnements: AbonnementPush[] = [
    ...(abonnesPublics ?? []).map((a) => ({
      endpoint: a.endpoint as string,
      keys: { p256dh: a.p256dh as string, auth: a.auth_key as string },
    })),
    ...(abonnesEmployes ?? []).map((a) => ({
      endpoint: a.endpoint as string,
      keys: { p256dh: a.p256dh as string, auth: a.auth_key as string },
    })),
  ];

  let envoyes = 0;
  let echecs = 0;
  const endpointsExpires: string[] = [];

  await Promise.allSettled(
    tousLesAbonnements.map(async (abonnement) => {
      try {
        await webpush.sendNotification(abonnement, payloadNotification);
        envoyes++;
      } catch (err: unknown) {
        echecs++;
        // Nettoyer les abonnements expirés (code 410 = Gone)
        if (
          typeof err === "object" &&
          err !== null &&
          "statusCode" in err &&
          (err as { statusCode: number }).statusCode === 410
        ) {
          endpointsExpires.push(abonnement.endpoint);
        }
      }
    }),
  );

  // Supprimer les abonnements expirés
  if (endpointsExpires.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions_public")
      .delete()
      .in("endpoint", endpointsExpires);

    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", endpointsExpires);
  }

  return NextResponse.json({
    succes: true,
    envoyes,
    echecs,
    total: tousLesAbonnements.length,
  });
}
