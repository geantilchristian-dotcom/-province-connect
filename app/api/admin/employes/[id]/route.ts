import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "../../../../../lib/supabase/admin";
import { createClient } from "../../../../../lib/supabase/server";

type RoleEmploye =
  | "super_admin"
  | "admin_provincial"
  | "chef_service"
  | "agent_enregistrement"
  | "agent_cartes"
  | "caissier"
  | "agent_communication"
  | "agent_controle";

type StatutCompte =
  | "invite"
  | "actif"
  | "suspendu"
  | "desactive";

type ProfilAdministrateur = {
  id: string;
  role: RoleEmploye;
  statut: StatutCompte;
};

type ProfilCible = {
  id: string;
  matricule: string | null;
  nom_complet: string;
  email: string;
  telephone: string | null;
  service_id: string | null;
  role: RoleEmploye;
  statut: StatutCompte;
  commune: string | null;
  bureau: string | null;
};

type ModificationEmploye = {
  nom_complet?: unknown;
  telephone?: unknown;
  service_id?: unknown;
  role?: unknown;
  statut?: unknown;
  commune?: unknown;
  bureau?: unknown;
};

type ContexteRoute = {
  params: Promise<{
    id: string;
  }>;
};

const ROLES_EMPLOYES: RoleEmploye[] = [
  "super_admin",
  "admin_provincial",
  "chef_service",
  "agent_enregistrement",
  "agent_cartes",
  "caissier",
  "agent_communication",
  "agent_controle",
];

const STATUTS_COMPTES: StatutCompte[] = [
  "invite",
  "actif",
  "suspendu",
  "desactive",
];

const ROLES_ELEVES: RoleEmploye[] = [
  "super_admin",
  "admin_provincial",
];

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

  return valeur
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, longueurMaximale);
}

function estUuid(valeur: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valeur,
  );
}

function estRoleEmploye(
  valeur: string,
): valeur is RoleEmploye {
  return ROLES_EMPLOYES.includes(
    valeur as RoleEmploye,
  );
}

function estStatutCompte(
  valeur: string,
): valeur is StatutCompte {
  return STATUTS_COMPTES.includes(
    valeur as StatutCompte,
  );
}

async function obtenirAdministrateurConnecte() {
  const supabase = await createClient();

  const {
    data: { user },
    error: erreurUtilisateur,
  } = await supabase.auth.getUser();

  if (erreurUtilisateur || !user) {
    return {
      profil: null,
      erreur: reponseErreur(
        "Vous devez être connecté.",
        401,
      ),
    };
  }

  const {
    data,
    error: erreurProfil,
  } = await supabase
    .from("profils")
    .select("id, role, statut")
    .eq("id", user.id)
    .maybeSingle();

  const profil =
    (data as ProfilAdministrateur | null) ||
    null;

  if (erreurProfil || !profil) {
    return {
      profil: null,
      erreur: reponseErreur(
        "Votre profil administrateur est introuvable.",
        403,
      ),
    };
  }

  if (
    profil.statut !== "actif" ||
    !ROLES_ELEVES.includes(profil.role)
  ) {
    return {
      profil: null,
      erreur: reponseErreur(
        "Vous n’avez pas l’autorisation de gérer les employés.",
        403,
      ),
    };
  }

  return {
    profil,
    erreur: null,
  };
}

async function obtenirProfilCible(
  employeId: string,
) {
  const supabaseAdmin = createAdminClient();

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("profils")
    .select(
      [
        "id",
        "matricule",
        "nom_complet",
        "email",
        "telephone",
        "service_id",
        "role",
        "statut",
        "commune",
        "bureau",
      ].join(","),
    )
    .eq("id", employeId)
    .maybeSingle();

  return {
    profil:
      (data as ProfilCible | null) || null,
    error,
  };
}

async function compterSuperAdministrateursActifs() {
  const supabaseAdmin = createAdminClient();

  const {
    count,
    error,
  } = await supabaseAdmin
    .from("profils")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("role", "super_admin")
    .eq("statut", "actif");

  if (error) {
    throw error;
  }

  return count || 0;
}

/*
 * PATCH /api/admin/employes/[id]
 *
 * Modifie le profil professionnel d’un employé.
 */
export async function PATCH(
  request: NextRequest,
  contexte: ContexteRoute,
) {
  const autorisation =
    await obtenirAdministrateurConnecte();

  if (autorisation.erreur) {
    return autorisation.erreur;
  }

  const administrateur =
    autorisation.profil;

  if (!administrateur) {
    return reponseErreur(
      "Profil administrateur indisponible.",
      403,
    );
  }

  const { id: employeId } =
    await contexte.params;

  if (!estUuid(employeId)) {
    return reponseErreur(
      "Identifiant employé invalide.",
      400,
    );
  }

  let corps: ModificationEmploye;

  try {
    corps =
      (await request.json()) as ModificationEmploye;
  } catch {
    return reponseErreur(
      "Les données envoyées sont invalides.",
      400,
    );
  }

  const {
    profil: profilCible,
    error: erreurProfilCible,
  } = await obtenirProfilCible(employeId);

  if (
    erreurProfilCible ||
    !profilCible
  ) {
    return reponseErreur(
      "L’employé est introuvable.",
      404,
    );
  }

  /*
   * Un administrateur provincial ne peut ni
   * modifier un super administrateur, ni modifier
   * un autre administrateur provincial.
   */
  if (
    administrateur.role ===
      "admin_provincial" &&
    ROLES_ELEVES.includes(
      profilCible.role,
    )
  ) {
    return reponseErreur(
      "Seul le Super administrateur peut modifier ce compte.",
      403,
    );
  }

  const nomComplet = nettoyerTexte(
    corps.nom_complet,
    120,
  );

  const telephone = nettoyerTexte(
    corps.telephone,
    40,
  );

  const serviceId = nettoyerTexte(
    corps.service_id,
    100,
  );

  const roleBrut = nettoyerTexte(
    corps.role,
    50,
  );

  const statutBrut = nettoyerTexte(
    corps.statut,
    30,
  );

  const commune = nettoyerTexte(
    corps.commune,
    100,
  );

  const bureau = nettoyerTexte(
    corps.bureau,
    120,
  );

  if (nomComplet.length < 3) {
    return reponseErreur(
      "Le nom complet est obligatoire.",
      400,
    );
  }

  if (
    !serviceId ||
    !estUuid(serviceId)
  ) {
    return reponseErreur(
      "Le service sélectionné est invalide.",
      400,
    );
  }

  if (!estRoleEmploye(roleBrut)) {
    return reponseErreur(
      "Le rôle sélectionné est invalide.",
      400,
    );
  }

  if (!estStatutCompte(statutBrut)) {
    return reponseErreur(
      "Le statut sélectionné est invalide.",
      400,
    );
  }

  if (
    administrateur.role ===
      "admin_provincial" &&
    ROLES_ELEVES.includes(roleBrut)
  ) {
    return reponseErreur(
      "Seul le Super administrateur peut attribuer ce rôle.",
      403,
    );
  }

  /*
   * Le compte actuellement connecté ne peut pas
   * se désactiver ou retirer son propre rôle.
   */
  if (
    administrateur.id === employeId &&
    (
      statutBrut !== "actif" ||
      roleBrut !== administrateur.role
    )
  ) {
    return reponseErreur(
      "Vous ne pouvez pas désactiver votre propre compte ni modifier votre propre rôle.",
      400,
    );
  }

  const supabaseAdmin = createAdminClient();

  const {
    data: service,
    error: erreurService,
  } = await supabaseAdmin
    .from("services")
    .select("id, code, nom, actif")
    .eq("id", serviceId)
    .maybeSingle();

  if (
    erreurService ||
    !service ||
    !service.actif
  ) {
    return reponseErreur(
      "Le service sélectionné est introuvable ou inactif.",
      400,
    );
  }

  /*
   * On protège le dernier Super administrateur
   * actif pour éviter de bloquer toute la plateforme.
   */
  const retireDernierSuperAdmin =
    profilCible.role === "super_admin" &&
    profilCible.statut === "actif" &&
    (
      roleBrut !== "super_admin" ||
      statutBrut !== "actif"
    );

  if (retireDernierSuperAdmin) {
    try {
      const nombreSuperAdmins =
        await compterSuperAdministrateursActifs();

      if (nombreSuperAdmins <= 1) {
        return reponseErreur(
          "Impossible de modifier le dernier Super administrateur actif.",
          400,
        );
      }
    } catch (error) {
      console.error(
        "Erreur comptage Super administrateurs :",
        error,
      );

      return reponseErreur(
        "Impossible de vérifier les administrateurs actifs.",
        500,
      );
    }
  }

  const {
    data: profilModifieBrut,
    error: erreurModification,
  } = await supabaseAdmin
    .from("profils")
    .update({
      nom_complet: nomComplet,
      telephone: telephone || null,
      service_id: service.id,
      role: roleBrut,
      statut: statutBrut,
      commune: commune || null,
      bureau: bureau || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeId)
    .select(
      [
        "id",
        "matricule",
        "nom_complet",
        "email",
        "telephone",
        "service_id",
        "role",
        "statut",
        "commune",
        "bureau",
        "derniere_connexion",
        "created_at",
        "updated_at",
        "created_by",
      ].join(","),
    )
    .single();

  if (
    erreurModification ||
    !profilModifieBrut
  ) {
    console.error(
      "Erreur modification employé :",
      erreurModification,
    );

    return reponseErreur(
      "Impossible de modifier le compte employé.",
      500,
    );
  }

  const profilModifie =
    profilModifieBrut as unknown as Record<
      string,
      unknown
    >;

  return NextResponse.json({
    succes: true,
    message:
      "Le compte employé a été modifié avec succès.",
    employe: {
      id: profilModifie.id,
      matricule: profilModifie.matricule,
      nom_complet:
        profilModifie.nom_complet,
      email: profilModifie.email,
      telephone: profilModifie.telephone,
      service_id:
        profilModifie.service_id,
      role: profilModifie.role,
      statut: profilModifie.statut,
      commune: profilModifie.commune,
      bureau: profilModifie.bureau,
      derniere_connexion:
        profilModifie.derniere_connexion,
      created_at:
        profilModifie.created_at,
      updated_at:
        profilModifie.updated_at,
      created_by:
        profilModifie.created_by,
      service: {
        id: service.id,
        code: service.code,
        nom: service.nom,
      },
    },
  });
}

/*
 * DELETE /api/admin/employes/[id]
 *
 * Supprime définitivement le compte Auth.
 * La suppression en cascade retire aussi le profil.
 */
export async function DELETE(
  _request: NextRequest,
  contexte: ContexteRoute,
) {
  const autorisation =
    await obtenirAdministrateurConnecte();

  if (autorisation.erreur) {
    return autorisation.erreur;
  }

  const administrateur =
    autorisation.profil;

  if (!administrateur) {
    return reponseErreur(
      "Profil administrateur indisponible.",
      403,
    );
  }

  if (
    administrateur.role !== "super_admin"
  ) {
    return reponseErreur(
      "Seul le Super administrateur peut supprimer définitivement un compte.",
      403,
    );
  }

  const { id: employeId } =
    await contexte.params;

  if (!estUuid(employeId)) {
    return reponseErreur(
      "Identifiant employé invalide.",
      400,
    );
  }

  if (administrateur.id === employeId) {
    return reponseErreur(
      "Vous ne pouvez pas supprimer votre propre compte.",
      400,
    );
  }

  const {
    profil: profilCible,
    error: erreurProfilCible,
  } = await obtenirProfilCible(employeId);

  if (
    erreurProfilCible ||
    !profilCible
  ) {
    return reponseErreur(
      "L’employé est introuvable.",
      404,
    );
  }

  if (
    profilCible.role === "super_admin" &&
    profilCible.statut === "actif"
  ) {
    try {
      const nombreSuperAdmins =
        await compterSuperAdministrateursActifs();

      if (nombreSuperAdmins <= 1) {
        return reponseErreur(
          "Impossible de supprimer le dernier Super administrateur actif.",
          400,
        );
      }
    } catch (error) {
      console.error(
        "Erreur comptage Super administrateurs :",
        error,
      );

      return reponseErreur(
        "Impossible de vérifier les administrateurs actifs.",
        500,
      );
    }
  }

  const supabaseAdmin = createAdminClient();

  const {
    error: erreurSuppression,
  } = await supabaseAdmin.auth.admin.deleteUser(
    employeId,
    false,
  );

  if (erreurSuppression) {
    console.error(
      "Erreur suppression employé :",
      erreurSuppression,
    );

    return reponseErreur(
      "Impossible de supprimer définitivement ce compte.",
      500,
    );
  }

  return NextResponse.json({
    succes: true,
    message:
      `Le compte ${profilCible.matricule || profilCible.email} a été supprimé définitivement.`,
  });
}
