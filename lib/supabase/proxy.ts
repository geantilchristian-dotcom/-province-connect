import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

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

type ProfilAcces = {
  id: string;
  role: RoleEmploye;
  statut: StatutCompte;
  service_id: string | null;
};

type ServiceAcces = {
  code: string;
};

type RegleAcces = {
  prefixe: string;
  roles: RoleEmploye[];
  servicesChef?: string[];
};

const ROLES_ADMINISTRATEURS: RoleEmploye[] = [
  "super_admin",
  "admin_provincial",
];

const ROLES_EMPLOYES: RoleEmploye[] = [
  "chef_service",
  "agent_enregistrement",
  "agent_cartes",
  "caissier",
  "agent_communication",
  "agent_controle",
];

const REGLES_MODULES: RegleAcces[] = [
  {
    prefixe: "/admin/employes",
    roles: ROLES_ADMINISTRATEURS,
  },
  {
    prefixe: "/admin/personnes",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "agent_enregistrement",
    ],
    servicesChef: ["ENR"],
  },
  {
    prefixe: "/admin/activites",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "agent_enregistrement",
    ],
    servicesChef: ["ENR", "ACT"],
  },
  {
    prefixe: "/admin/cartes",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "agent_cartes",
    ],
    servicesChef: ["CAR"],
  },
  {
    prefixe: "/admin/taxes",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "caissier",
    ],
    servicesChef: ["FIN"],
  },
  {
    prefixe: "/admin/paiements",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "caissier",
    ],
    servicesChef: ["FIN"],
  },
  {
    prefixe: "/admin/recus",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "caissier",
    ],
    servicesChef: ["FIN"],
  },
  {
    prefixe: "/admin/communiques",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "agent_communication",
    ],
    servicesChef: ["COM"],
  },
];

function correspond(
  chemin: string,
  prefixe: string,
) {
  return (
    chemin === prefixe ||
    chemin.startsWith(`${prefixe}/`)
  );
}

function accesAutorise(
  profil: ProfilAcces,
  codeService: string | null,
  regle: RegleAcces,
) {
  if (regle.roles.includes(profil.role)) {
    return true;
  }

  return (
    profil.role === "chef_service" &&
    Boolean(
      codeService &&
        regle.servicesChef?.includes(
          codeService,
        ),
    )
  );
}

function copierCookies(
  source: NextResponse,
  destination: NextResponse,
) {
  source.cookies.getAll().forEach((cookie) => {
    destination.cookies.set(cookie);
  });

  return destination;
}

function rediriger(
  request: NextRequest,
  reponseSource: NextResponse,
  destination: string,
  erreur?: string,
) {
  const url = request.nextUrl.clone();

  url.pathname = destination;
  url.search = "";

  if (erreur) {
    url.searchParams.set("erreur", erreur);
  }

  return copierCookies(
    reponseSource,
    NextResponse.redirect(url),
  );
}

function reponseApi(
  reponseSource: NextResponse,
  message: string,
  statut: number,
) {
  return copierCookies(
    reponseSource,
    NextResponse.json(
      {
        succes: false,
        message,
      },
      {
        status: statut,
      },
    ),
  );
}

export async function updateSession(
  request: NextRequest,
) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const clePublique =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !clePublique) {
    throw new Error(
      "La configuration Supabase est incomplète.",
    );
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    clePublique,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(name, value);
            },
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options,
              );
            },
          );
        },
      },
    },
  );

  const chemin = request.nextUrl.pathname;
  const estConnexion =
    chemin === "/admin/login";
  const estAdmin =
    chemin.startsWith("/admin");
  const estEmploye =
    chemin.startsWith("/employe");
  const estApiAdmin =
    chemin.startsWith("/api/admin");

  const {
    data: claims,
    error: erreurClaims,
  } = await supabase.auth.getClaims();

  const utilisateurId =
    typeof claims?.claims?.sub === "string"
      ? claims.claims.sub
      : null;

  if (erreurClaims || !utilisateurId) {
    if (estApiAdmin) {
      return reponseApi(
        supabaseResponse,
        "Connexion requise.",
        401,
      );
    }

    if (
      (estAdmin && !estConnexion) ||
      estEmploye
    ) {
      return rediriger(
        request,
        supabaseResponse,
        "/admin/login",
        "connexion-requise",
      );
    }

    return supabaseResponse;
  }

  const {
    data: profil,
    error: erreurProfil,
  } = await supabase
    .from("profils")
    .select(
      "id, role, statut, service_id",
    )
    .eq("id", utilisateurId)
    .maybeSingle<ProfilAcces>();

  if (
    erreurProfil ||
    !profil ||
    profil.statut !== "actif"
  ) {
    await supabase.auth.signOut({
      scope: "local",
    });

    if (estApiAdmin) {
      return reponseApi(
        supabaseResponse,
        "Compte professionnel non autorisé.",
        403,
      );
    }

    if (estAdmin || estEmploye) {
      return rediriger(
        request,
        supabaseResponse,
        "/admin/login",
        "compte-non-autorise",
      );
    }

    return supabaseResponse;
  }

  let codeService: string | null = null;

  if (profil.service_id) {
    const { data: service } = await supabase
      .from("services")
      .select("code")
      .eq("id", profil.service_id)
      .maybeSingle<ServiceAcces>();

    codeService = service?.code || null;
  }

  const estAdministrateur =
    ROLES_ADMINISTRATEURS.includes(
      profil.role,
    );

  const estCompteEmploye =
    ROLES_EMPLOYES.includes(profil.role);

  if (estConnexion) {
    return rediriger(
      request,
      supabaseResponse,
      estAdministrateur
        ? "/admin/dashboard"
        : "/employe/dashboard",
    );
  }

  if (
    chemin === "/admin/dashboard" &&
    !estAdministrateur
  ) {
    return rediriger(
      request,
      supabaseResponse,
      "/employe/dashboard",
      "espace-employe",
    );
  }

  if (
    chemin === "/employe/dashboard" &&
    estAdministrateur
  ) {
    return rediriger(
      request,
      supabaseResponse,
      "/admin/dashboard",
    );
  }

  if (
    chemin === "/employe/dashboard" &&
    !estCompteEmploye
  ) {
    return rediriger(
      request,
      supabaseResponse,
      "/admin/login",
      "role-invalide",
    );
  }

  if (estApiAdmin && !estAdministrateur) {
    return reponseApi(
      supabaseResponse,
      "Cette fonction est réservée à l’administration.",
      403,
    );
  }

  if (
    estAdmin &&
    !estConnexion &&
    chemin !== "/admin/dashboard"
  ) {
    const regle = REGLES_MODULES.find(
      (element) =>
        correspond(
          chemin,
          element.prefixe,
        ),
    );

    const autorise = regle
      ? accesAutorise(
          profil,
          codeService,
          regle,
        )
      : estAdministrateur;

    if (!autorise) {
      return rediriger(
        request,
        supabaseResponse,
        estAdministrateur
          ? "/admin/dashboard"
          : "/employe/dashboard",
        "acces-refuse",
      );
    }
  }

  return supabaseResponse;
}
