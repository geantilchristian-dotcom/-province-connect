import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";

type StatutCompte =
  | "invite"
  | "actif"
  | "suspendu"
  | "desactive";

type CorpsAbonnement = {
  subscription?: unknown;
  endpoint?: unknown;
  keys?: unknown;
  plateforme?: unknown;
};

type AbonnementPush = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

function reponseErreur(
  message: string,
  statut: number,
) {
  return NextResponse.json(
    {
      succes: false,
      message,
    },
    {
      status: statut,
    },
  );
}

function nettoyerTexte(
  valeur: unknown,
  longueurMaximale: number,
) {
  if (typeof valeur !== "string") {
    return "";
  }

  return valeur.trim().slice(0, longueurMaximale);
}

async function obtenirUtilisateurActif() {
  const supabase = await createClient();

  const {
    data: { user },
    error: erreurUtilisateur,
  } = await supabase.auth.getUser();

  if (erreurUtilisateur || !user) {
    return {
      user: null,
      erreur: reponseErreur(
        "Vous devez être connecté pour activer les notifications.",
        401,
      ),
    };
  }

  const {
    data: profilBrut,
    error: erreurProfil,
  } = await supabase
    .from("profils")
    .select("statut")
    .eq("id", user.id)
    .maybeSingle();

  const profil =
    profilBrut as
      | {
          statut: StatutCompte;
        }
      | null;

  if (
    erreurProfil ||
    !profil ||
    profil.statut !== "actif"
  ) {
    return {
      user: null,
      erreur: reponseErreur(
        "Votre compte professionnel n’est pas actif.",
        403,
      ),
    };
  }

  return {
    user,
    erreur: null,
  };
}

/*
 * POST /api/notifications/subscribe
 *
 * Enregistre ou actualise l’abonnement Push du navigateur
 * actuellement connecté.
 */
export async function POST(
  request: NextRequest,
) {
  const autorisation =
    await obtenirUtilisateurActif();

  if (autorisation.erreur) {
    return autorisation.erreur;
  }

  const utilisateur = autorisation.user;

  if (!utilisateur) {
    return reponseErreur(
      "Utilisateur introuvable.",
      401,
    );
  }

  let corps: CorpsAbonnement;

  try {
    corps =
      (await request.json()) as CorpsAbonnement;
  } catch {
    return reponseErreur(
      "Les données de notification sont invalides.",
      400,
    );
  }

  const abonnementBrut =
    corps.subscription &&
    typeof corps.subscription === "object"
      ? corps.subscription
      : corps;

  const abonnement =
    abonnementBrut as AbonnementPush;

  const endpoint = nettoyerTexte(
    abonnement.endpoint,
    4000,
  );

  const p256dh = nettoyerTexte(
    abonnement.keys?.p256dh,
    1000,
  );

  const authKey = nettoyerTexte(
    abonnement.keys?.auth,
    1000,
  );

  const plateforme =
    nettoyerTexte(
      corps.plateforme,
      120,
    ) || "Navigateur Web";

  const userAgent = nettoyerTexte(
    request.headers.get("user-agent"),
    1000,
  );

  if (
    !endpoint ||
    !p256dh ||
    !authKey
  ) {
    return reponseErreur(
      "L’abonnement Push est incomplet.",
      400,
    );
  }

  if (!endpoint.startsWith("https://")) {
    return reponseErreur(
      "L’adresse du service Push est invalide.",
      400,
    );
  }

  const supabaseAdmin =
    createAdminClient();

  const {
    data: abonnementEnregistre,
    error: erreurEnregistrement,
  } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert(
      {
        user_id: utilisateur.id,
        endpoint,
        p256dh,
        auth_key: authKey,
        user_agent: userAgent || null,
        plateforme,
        actif: true,
        derniere_utilisation:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: "endpoint",
      },
    )
    .select(
      "id, user_id, actif, plateforme",
    )
    .single();

  if (
    erreurEnregistrement ||
    !abonnementEnregistre
  ) {
    console.error(
      "Erreur abonnement Push :",
      erreurEnregistrement,
    );

    return reponseErreur(
      "Impossible d’enregistrer cet appareil pour les notifications.",
      500,
    );
  }

  return NextResponse.json({
    succes: true,
    message:
      "Les notifications sont activées sur cet appareil.",
    abonnement: abonnementEnregistre,
  });
}

/*
 * DELETE /api/notifications/subscribe
 *
 * Désactive les notifications de l’appareil courant.
 */
export async function DELETE(
  request: NextRequest,
) {
  const autorisation =
    await obtenirUtilisateurActif();

  if (autorisation.erreur) {
    return autorisation.erreur;
  }

  const utilisateur = autorisation.user;

  if (!utilisateur) {
    return reponseErreur(
      "Utilisateur introuvable.",
      401,
    );
  }

  let corps: {
    endpoint?: unknown;
  };

  try {
    corps = (await request.json()) as {
      endpoint?: unknown;
    };
  } catch {
    return reponseErreur(
      "Les données envoyées sont invalides.",
      400,
    );
  }

  const endpoint = nettoyerTexte(
    corps.endpoint,
    4000,
  );

  if (!endpoint) {
    return reponseErreur(
      "L’adresse de l’abonnement est obligatoire.",
      400,
    );
  }

  const supabaseAdmin =
    createAdminClient();

  const {
    error: erreurSuppression,
  } = await supabaseAdmin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", utilisateur.id)
    .eq("endpoint", endpoint);

  if (erreurSuppression) {
    console.error(
      "Erreur suppression abonnement Push :",
      erreurSuppression,
    );

    return reponseErreur(
      "Impossible de désactiver les notifications.",
      500,
    );
  }

  return NextResponse.json({
    succes: true,
    message:
      "Les notifications sont désactivées sur cet appareil.",
  });
}