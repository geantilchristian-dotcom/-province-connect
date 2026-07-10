import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";

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
  service_id: string | null;
};

type CreationEmploye = {
  nom_complet?: unknown;
  email?: unknown;
  telephone?: unknown;
  mot_de_passe?: unknown;
  service_id?: unknown;
  role?: unknown;
  statut?: unknown;
  commune?: unknown;
  bureau?: unknown;
};

type ProfilEmployeCree = {
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
  created_at: string;
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

const STATUTS_CREATION: StatutCompte[] = [
  "invite",
  "actif",
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
  longueurMaximale = 150,
) {
  if (typeof valeur !== "string") {
    return "";
  }

  return valeur
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, longueurMaximale);
}

function estEmailValide(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function estRoleEmploye(
  valeur: string,
): valeur is RoleEmploye {
  return ROLES_EMPLOYES.includes(
    valeur as RoleEmploye,
  );
}

function estStatutCreation(
  valeur: string,
): valeur is StatutCompte {
  return STATUTS_CREATION.includes(
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
      erreur: reponseErreur(
        "Vous devez être connecté pour effectuer cette action.",
        401,
      ),
      profil: null,
    };
  }

  const {
    data: profil,
    error: erreurProfil,
  } = await supabase
    .from("profils")
    .select("id, role, statut, service_id")
    .eq("id", user.id)
    .maybeSingle<ProfilAdministrateur>();

  if (erreurProfil || !profil) {
    return {
      erreur: reponseErreur(
        "Votre profil employé est introuvable.",
        403,
      ),
      profil: null,
    };
  }

  if (profil.statut !== "actif") {
    return {
      erreur: reponseErreur(
        "Votre compte employé n’est pas actif.",
        403,
      ),
      profil: null,
    };
  }

  if (
    profil.role !== "super_admin" &&
    profil.role !== "admin_provincial"
  ) {
    return {
      erreur: reponseErreur(
        "Vous n’avez pas l’autorisation de gérer les employés.",
        403,
      ),
      profil: null,
    };
  }

  return {
    erreur: null,
    profil,
  };
}

async function genererMatricule(
  codeService: string,
) {
  const supabaseAdmin = createAdminClient();
  const annee = new Date().getFullYear();
  const codeNettoye = codeService
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);

  for (
    let tentative = 0;
    tentative < 15;
    tentative += 1
  ) {
    const nombre = randomInt(0, 1_000_000);

    const matricule =
      `PC-${codeNettoye}-${annee}-` +
      String(nombre).padStart(6, "0");

    const {
      data: profilExistant,
      error,
    } = await supabaseAdmin
      .from("profils")
      .select("id")
      .eq("matricule", matricule)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!profilExistant) {
      return matricule;
    }
  }

  throw new Error(
    "Impossible de générer un matricule unique.",
  );
}

/*
 * GET /api/admin/employes
 *
 * Retourne les employés et les services.
 * Cette route est réservée aux super administrateurs
 * et administrateurs provinciaux actifs.
 */
export async function GET() {
  const autorisation =
    await obtenirAdministrateurConnecte();

  if (autorisation.erreur) {
    return autorisation.erreur;
  }

  const supabaseAdmin = createAdminClient();

  const [
    resultatEmployes,
    resultatServices,
  ] = await Promise.all([
    supabaseAdmin
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
          "derniere_connexion",
          "created_at",
          "updated_at",
          "created_by",
        ].join(","),
      )
      .order("created_at", {
        ascending: false,
      }),

    supabaseAdmin
      .from("services")
      .select(
        "id, code, nom, description, actif",
      )
      .order("nom", {
        ascending: true,
      }),
  ]);

  if (resultatEmployes.error) {
    console.error(
      "Erreur lecture employés :",
      resultatEmployes.error,
    );

    return reponseErreur(
      "Impossible de charger les employés.",
      500,
    );
  }

  if (resultatServices.error) {
    console.error(
      "Erreur lecture services :",
      resultatServices.error,
    );

    return reponseErreur(
      "Impossible de charger les services.",
      500,
    );
  }

  return NextResponse.json({
    succes: true,
    employes: resultatEmployes.data || [],
    services: resultatServices.data || [],
    role_connecte: autorisation.profil?.role,
  });
}

/*
 * POST /api/admin/employes
 *
 * Crée un utilisateur Supabase Auth, puis complète
 * son profil employé dans public.profils.
 */
export async function POST(
  request: NextRequest,
) {
  const autorisation =
    await obtenirAdministrateurConnecte();

  if (autorisation.erreur) {
    return autorisation.erreur;
  }

  let corps: CreationEmploye;

  try {
    corps = (await request.json()) as CreationEmploye;
  } catch {
    return reponseErreur(
      "Les données envoyées sont invalides.",
      400,
    );
  }

  const nomComplet = nettoyerTexte(
    corps.nom_complet,
    120,
  );

  const email = nettoyerTexte(
    corps.email,
    180,
  ).toLowerCase();

  const telephone = nettoyerTexte(
    corps.telephone,
    40,
  );

  const motDePasse =
    typeof corps.mot_de_passe === "string"
      ? corps.mot_de_passe
      : "";

  const serviceId = nettoyerTexte(
    corps.service_id,
    100,
  );

  const roleBrut = nettoyerTexte(
    corps.role,
    50,
  );

  const statutBrut =
    nettoyerTexte(corps.statut, 30) ||
    "actif";

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
      "Le nom complet de l’employé est obligatoire.",
      400,
    );
  }

  if (!estEmailValide(email)) {
    return reponseErreur(
      "L’adresse e-mail de l’employé est invalide.",
      400,
    );
  }

  if (motDePasse.length < 10) {
    return reponseErreur(
      "Le mot de passe temporaire doit contenir au moins 10 caractères.",
      400,
    );
  }

  if (!serviceId) {
    return reponseErreur(
      "Veuillez sélectionner le service de l’employé.",
      400,
    );
  }

  if (!estRoleEmploye(roleBrut)) {
    return reponseErreur(
      "Le rôle sélectionné est invalide.",
      400,
    );
  }

  if (!estStatutCreation(statutBrut)) {
    return reponseErreur(
      "Le statut initial doit être « actif » ou « invite ».",
      400,
    );
  }

  const profilConnecte = autorisation.profil;

  if (!profilConnecte) {
    return reponseErreur(
      "Votre profil administrateur est indisponible.",
      403,
    );
  }

  /*
   * Seul le super administrateur peut créer
   * un autre super administrateur ou
   * un administrateur provincial.
   */
  if (
    profilConnecte.role !== "super_admin" &&
    (
      roleBrut === "super_admin" ||
      roleBrut === "admin_provincial"
    )
  ) {
    return reponseErreur(
      "Seul le super administrateur peut attribuer ce rôle.",
      403,
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

  let matricule: string;

  try {
    matricule = await genererMatricule(
      service.code,
    );
  } catch (error) {
    console.error(
      "Erreur génération matricule :",
      error,
    );

    return reponseErreur(
      "Impossible de générer le matricule de l’employé.",
      500,
    );
  }

  const {
    data: creationUtilisateur,
    error: erreurCreation,
  } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,

    user_metadata: {
      nom_complet: nomComplet,
      role: roleBrut,
      service_id: service.id,
      matricule,
    },
  });

  if (
    erreurCreation ||
    !creationUtilisateur.user
  ) {
    console.error(
      "Erreur création Auth :",
      erreurCreation,
    );

    const messageErreur =
      erreurCreation?.message
        .toLowerCase()
        .includes("already")
        ? "Un compte utilise déjà cette adresse e-mail."
        : "Impossible de créer le compte de l’employé.";

    return reponseErreur(
      messageErreur,
      erreurCreation?.message
        .toLowerCase()
        .includes("already")
        ? 409
        : 500,
    );
  }

  const utilisateurCree =
    creationUtilisateur.user;

  const {
    data: profilCree,
    error: erreurMiseAJour,
  } = await supabaseAdmin
    .from("profils")
    .update({
      matricule,
      nom_complet: nomComplet,
      email,
      telephone: telephone || null,
      service_id: service.id,
      role: roleBrut,
      statut: statutBrut,
      commune: commune || null,
      bureau: bureau || null,
      created_by: profilConnecte.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", utilisateurCree.id)
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
        "created_at",
      ].join(","),
    )
    .single<ProfilEmployeCree>();

  if (
    erreurMiseAJour ||
    !profilCree
  ) {
    console.error(
      "Erreur mise à jour profil :",
      erreurMiseAJour,
    );

    /*
     * Annulation de la création Auth si le profil
     * n’a pas pu être finalisé.
     */
    await supabaseAdmin.auth.admin.deleteUser(
      utilisateurCree.id,
    );

    return reponseErreur(
      "Le compte n’a pas pu être finalisé. Aucun employé n’a été créé.",
      500,
    );
  }

  return NextResponse.json(
    {
      succes: true,
      message:
        `Le compte ${matricule} a été créé avec succès.`,
      employe: {
        ...profilCree,
        service: {
          id: service.id,
          code: service.code,
          nom: service.nom,
        },
      },
    },
    {
      status: 201,
    },
  );
}
