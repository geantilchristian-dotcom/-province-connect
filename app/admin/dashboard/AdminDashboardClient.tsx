"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSupabaseCollection } from "../../../lib/data/useSupabaseCollection";

import { createClient } from "../../../lib/supabase/client";
import NotificationButton from "../../../components/NotificationButton";

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

type ProfilEmploye = {
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

type ServiceEmploye = {
  id: string;
  code: string;
  nom: string;
};

type Personne = {
  id: string;
  statut: string;
};

type Activite = {
  id: string;
  statut: string;
};

type Carte = {
  id: string;
  statut: string;
  titulaireNom?: string;
  numeroDocument?: string;
  typeDocumentNom?: string;
  createdAt?: string;
  updatedAt?: string;
  dateDelivrance?: string;
};

type Paiement = {
  id: string;
  statut: string;
  devise: "CDF" | "USD";
  montantPaye: number;
  payeurNom?: string;
  numero?: string;
  taxeNom?: string;
  createdAt?: string;
  updatedAt?: string;
  datePaiement?: string;
};

type Communique = {
  id: string;
  statut: string;
};

type ModuleApplication = {
  titre: string;
  description: string;
  href: string;
  code: string;
  roles: RoleEmploye[];
  servicesChef?: string[];
};

type Statistique = {
  titre: string;
  valeur: string;
  description: string;
  href: string;
  code: string;
  roles: RoleEmploye[];
  servicesChef?: string[];
};

const CLE_PERSONNES = "province-connect-personnes";
const CLE_ACTIVITES = "province-connect-activites";
const CLE_CARTES = "province-connect-cartes";
const CLE_TAXES = "province-connect-taxes";
const CLE_PAIEMENTS = "province-connect-paiements";
const CLE_RECUS = "province-connect-recus";
const CLE_COMMUNIQUES = "province-connect-communiques";

const ROLES_ADMINISTRATEURS: RoleEmploye[] = [
  "super_admin",
  "admin_provincial",
];

const LIBELLES_ROLES: Record<RoleEmploye, string> = {
  super_admin: "Super administrateur",
  admin_provincial: "Administrateur provincial",
  chef_service: "Chef de service",
  agent_enregistrement: "Agent d’enregistrement",
  agent_cartes: "Agent cartes et permis",
  caissier: "Caissier",
  agent_communication: "Agent communication",
  agent_controle: "Agent de contrôle",
};

const MODULES: ModuleApplication[] = [
  {
    titre: "Personnes",
    description:
      "Enregistrer et consulter les citoyens, professionnels et responsables.",
    href: "/admin/personnes",
    code: "PER",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "agent_enregistrement",
      "agent_controle",
    ],
    servicesChef: ["ENR"],
  },
  {
    titre: "Activités",
    description:
      "Gérer les boutiques, entreprises, associations et structures.",
    href: "/admin/activites",
    code: "ACT",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "agent_enregistrement",
      "agent_controle",
    ],
    servicesChef: ["ENR", "ACT"],
  },
  {
    titre: "Cartes et permis",
    description:
      "Créer, renouveler, imprimer et vérifier les documents provinciaux.",
    href: "/admin/cartes",
    code: "CAR",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "agent_cartes",
      "agent_controle",
    ],
    servicesChef: ["CAR", "CTR"],
  },
  {
    titre: "Taxes",
    description:
      "Configurer et consulter les obligations et tarifs provinciaux.",
    href: "/admin/taxes",
    code: "TAX",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "caissier",
    ],
    servicesChef: ["FIN"],
  },
  {
    titre: "Paiements",
    description:
      "Enregistrer les encaissements et suivre les opérations financières.",
    href: "/admin/paiements",
    code: "PAY",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "caissier",
    ],
    servicesChef: ["FIN"],
  },
  {
    titre: "Reçus",
    description:
      "Consulter, imprimer et vérifier les reçus numériques.",
    href: "/admin/recus",
    code: "REC",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "caissier",
      "agent_controle",
    ],
    servicesChef: ["FIN", "CTR"],
  },
  {
    titre: "Communiqués",
    description:
      "Publier les annonces et informations officielles destinées au public.",
    href: "/admin/communiques",
    code: "COM",
    roles: [
      ...ROLES_ADMINISTRATEURS,
      "agent_communication",
    ],
    servicesChef: ["COM"],
  },
];

function formaterNombre(valeur: number) {
  return new Intl.NumberFormat("fr-FR").format(
    valeur,
  );
}

function formaterMontant(
  montant: number,
  devise: "CDF" | "USD",
) {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: devise === "USD" ? 2 : 0,
    maximumFractionDigits: devise === "USD" ? 2 : 0,
  }).format(montant)} ${devise}`;
}

function obtenirInitiales(nom: string) {
  return nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((partie) =>
      partie.charAt(0).toUpperCase(),
    )
    .join("");
}

function obtenirTemps(
  createdAt?: string,
  updatedAt?: string,
  dateMetier?: string,
) {
  const valeur =
    updatedAt || createdAt || dateMetier || "";

  const temps = new Date(valeur).getTime();

  return Number.isNaN(temps) ? 0 : temps;
}

function formaterDate(date?: string) {
  if (!date) {
    return "Date inconnue";
  }

  const objetDate = new Date(date);

  if (Number.isNaN(objetDate.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(objetDate);
}

function accesAutorise(
  role: RoleEmploye,
  codeService: string | null,
  roles: RoleEmploye[],
  servicesChef?: string[],
) {
  if (roles.includes(role)) {
    return true;
  }

  return (
    role === "chef_service" &&
    Boolean(
      codeService &&
        servicesChef?.includes(codeService),
    )
  );
}

function classeStatut(statut: string) {
  if (
    [
      "Actif",
      "Valide",
      "Payé",
      "Autorisé",
      "Publié",
    ].includes(statut)
  ) {
    return "bg-green-100 text-green-800";
  }

  if (
    [
      "En attente",
      "Brouillon",
      "Partiel",
      "À renouveler",
    ].includes(statut)
  ) {
    return "bg-orange-100 text-orange-800";
  }

  if (
    [
      "Suspendu",
      "Révoqué",
      "Annulé",
      "Refusé",
      "Fermé",
    ].includes(statut)
  ) {
    return "bg-red-100 text-red-800";
  }

  return "bg-neutral-100 text-neutral-700";
}

type AdminDashboardClientProps = {
  profil: ProfilEmploye;
  service: ServiceEmploye | null;
  nombreEmployesInitial: number;
};

export default function AdminDashboardClient({
  profil,
  service,
  nombreEmployesInitial,
}: AdminDashboardClientProps) {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [personnes, setPersonnes] =
    useState<Personne[]>([]);

  const [activites, setActivites] =
    useState<Activite[]>([]);

  const [cartes, setCartes] =
    useState<Carte[]>([]);

  const [paiements, setPaiements] =
    useState<Paiement[]>([]);

  const [communiques, setCommuniques] =
    useState<Communique[]>([]);

  const [taxes, setTaxes] = useState<{ id: string }[]>([]);

  const [recus, setRecus] = useState<{ id: string }[]>([]);

  const nombreTaxes = taxes.length;
  const nombreRecus = recus.length;

  const [
    deconnexionEnCours,
    setDeconnexionEnCours,
  ] = useState(false);

  const [menuMobileOuvert, setMenuMobileOuvert] =
    useState(false);

  const [erreur, setErreur] = useState("");

  useSupabaseCollection({
    table: "personnes",
    items: personnes,
    setItems: setPersonnes,
    readOnly: true,
    onError: setErreur,
  });

  useSupabaseCollection({
    table: "activites",
    items: activites,
    setItems: setActivites,
    readOnly: true,
    onError: setErreur,
  });

  useSupabaseCollection({
    table: "cartes",
    items: cartes,
    setItems: setCartes,
    readOnly: true,
    onError: setErreur,
  });

  useSupabaseCollection({
    table: "paiements",
    items: paiements,
    setItems: setPaiements,
    readOnly: true,
    onError: setErreur,
  });

  useSupabaseCollection({
    table: "communiques",
    items: communiques,
    setItems: setCommuniques,
    readOnly: true,
    onError: setErreur,
  });

  useSupabaseCollection({
    table: "taxes",
    items: taxes,
    setItems: setTaxes,
    readOnly: true,
    onError: setErreur,
  });

  useSupabaseCollection({
    table: "recus",
    items: recus,
    setItems: setRecus,
    readOnly: true,
    onError: setErreur,
  });

  const modulesAutorises = useMemo(() => {
    if (!profil) {
      return [];
    }

    return MODULES.filter((module) =>
      accesAutorise(
        profil.role,
        service?.code || null,
        module.roles,
        module.servicesChef,
      ),
    );
  }, [profil, service]);

  const statistiques = useMemo(() => {
    if (!profil) {
      return [];
    }

    const personnesDisponibles =
      personnes.filter(
        (personne) =>
          personne.statut !== "Archivé" &&
          personne.statut !== "Suspendu",
      ).length;

    const activitesDisponibles =
      activites.filter(
        (activite) =>
          ![
            "Fermé",
            "Refusé",
            "Suspendu",
          ].includes(activite.statut),
      ).length;

    const cartesValides = cartes.filter(
      (carte) =>
        carte.statut === "Valide",
    ).length;

    const paiementsConfirmes =
      paiements.filter((paiement) =>
        ["Payé", "Partiel"].includes(
          paiement.statut,
        ),
      ).length;

    const toutesStatistiques: Statistique[] = [
      {
        titre: "Personnes",
        valeur: formaterNombre(
          personnes.length,
        ),
        description:
          `${formaterNombre(personnesDisponibles)} dossier(s) disponible(s)`,
        href: "/admin/personnes",
        code: "PER",
        roles: [
          ...ROLES_ADMINISTRATEURS,
          "agent_enregistrement",
          "agent_controle",
        ],
        servicesChef: ["ENR"],
      },
      {
        titre: "Activités",
        valeur: formaterNombre(
          activites.length,
        ),
        description:
          `${formaterNombre(activitesDisponibles)} activité(s) disponible(s)`,
        href: "/admin/activites",
        code: "ACT",
        roles: [
          ...ROLES_ADMINISTRATEURS,
          "agent_enregistrement",
          "agent_controle",
        ],
        servicesChef: ["ENR", "ACT"],
      },
      {
        titre: "Cartes valides",
        valeur: formaterNombre(
          cartesValides,
        ),
        description:
          `${formaterNombre(cartes.length)} document(s) au total`,
        href: "/admin/cartes",
        code: "CAR",
        roles: [
          ...ROLES_ADMINISTRATEURS,
          "agent_cartes",
          "agent_controle",
        ],
        servicesChef: ["CAR", "CTR"],
      },
      {
        titre: "Paiements",
        valeur: formaterNombre(
          paiementsConfirmes,
        ),
        description:
          `${formaterNombre(paiements.length)} opération(s) au total`,
        href: "/admin/paiements",
        code: "PAY",
        roles: [
          ...ROLES_ADMINISTRATEURS,
          "caissier",
        ],
        servicesChef: ["FIN"],
      },
      {
        titre: "Employés",
        valeur: formaterNombre(
          nombreEmployesInitial,
        ),
        description:
          "Comptes professionnels enregistrés",
        href: "/admin/employes",
        code: "EMP",
        roles: ROLES_ADMINISTRATEURS,
      },
    ];

    return toutesStatistiques.filter(
      (statistique) =>
        accesAutorise(
          profil.role,
          service?.code || null,
          statistique.roles,
          statistique.servicesChef,
        ),
    );
  }, [
    activites,
    cartes,
    nombreEmployesInitial,
    paiements,
    personnes,
    profil,
    service,
  ]);

  const syntheseFinanciere = useMemo(() => {
    const operations = paiements.filter(
      (paiement) =>
        ![
          "Annulé",
          "Remboursé",
        ].includes(paiement.statut),
    );

    return {
      cdf: operations
        .filter(
          (paiement) =>
            paiement.devise === "CDF",
        )
        .reduce(
          (total, paiement) =>
            total +
            Number(
              paiement.montantPaye || 0,
            ),
          0,
        ),

      usd: operations
        .filter(
          (paiement) =>
            paiement.devise === "USD",
        )
        .reduce(
          (total, paiement) =>
            total +
            Number(
              paiement.montantPaye || 0,
            ),
          0,
        ),
    };
  }, [paiements]);

  const derniersDocuments = useMemo(() => {
    return [...cartes]
      .sort(
        (a, b) =>
          obtenirTemps(
            b.createdAt,
            b.updatedAt,
            b.dateDelivrance,
          ) -
          obtenirTemps(
            a.createdAt,
            a.updatedAt,
            a.dateDelivrance,
          ),
      )
      .slice(0, 5);
  }, [cartes]);

  const derniersPaiements = useMemo(() => {
    return [...paiements]
      .sort(
        (a, b) =>
          obtenirTemps(
            b.createdAt,
            b.updatedAt,
            b.datePaiement,
          ) -
          obtenirTemps(
            a.createdAt,
            a.updatedAt,
            a.datePaiement,
          ),
      )
      .slice(0, 5);
  }, [paiements]);

  const estAdministrateur = Boolean(
    profil &&
      ROLES_ADMINISTRATEURS.includes(
        profil.role,
      ),
  );

  const accesFinance = Boolean(
    profil &&
      accesAutorise(
        profil.role,
        service?.code || null,
        [
          ...ROLES_ADMINISTRATEURS,
          "caissier",
        ],
        ["FIN"],
      ),
  );

  const accesCartes = Boolean(
    profil &&
      accesAutorise(
        profil.role,
        service?.code || null,
        [
          ...ROLES_ADMINISTRATEURS,
          "agent_cartes",
          "agent_controle",
        ],
        ["CAR", "CTR"],
      ),
  );

  async function deconnecter() {
    if (deconnexionEnCours) {
      return;
    }

    setDeconnexionEnCours(true);
    setErreur("");

    try {
      const { error } =
        await supabase.auth.signOut({
          scope: "local",
        });

      if (error) {
        setErreur(
          "La déconnexion a échoué.",
        );
        setDeconnexionEnCours(false);
        return;
      }

      window.location.replace(
        "/admin/login",
      );
    } catch {
      setErreur(
        "Une erreur empêche la déconnexion.",
      );
      setDeconnexionEnCours(false);
    }
  }

  const titreEspace =
    profil.role === "super_admin"
      ? "Tableau de bord général"
      : profil.role ===
          "admin_provincial"
        ? "Administration provinciale"
        : `Espace ${LIBELLES_ROLES[
            profil.role
          ].toLowerCase()}`;

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white shadow-sm">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setMenuMobileOuvert(true)
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white lg:hidden"
              aria-label="Ouvrir le menu"
            >
              ☰
            </button>

            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-xs font-black text-white">
                PC
              </div>

              <div>
                <p className="font-black">
                  Province Connect
                </p>

                <p className="text-xs text-neutral-500">
                  {titreEspace}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <NotificationButton />

            <Link
              href="/"
              className="hidden min-h-10 items-center rounded-xl border border-black/10 px-4 text-sm font-extrabold transition hover:bg-neutral-100 sm:inline-flex"
            >
              ← Retour au site public
            </Link>

            <div className="flex items-center gap-3 rounded-xl bg-neutral-950 px-3 py-2 text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-xs font-black">
                {obtenirInitiales(
                  profil.nom_complet,
                ) || "PC"}
              </div>

              <div className="hidden sm:block">
                <p className="max-w-44 truncate text-xs font-extrabold">
                  {profil.nom_complet}
                </p>

                <p className="max-w-44 truncate text-[11px] text-neutral-400">
                  {LIBELLES_ROLES[
                    profil.role
                  ]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)]">
        <aside className="hidden w-72 shrink-0 bg-neutral-950 text-white lg:block">
          <div className="sticky top-16 flex h-[calc(100vh-64px)] flex-col overflow-y-auto p-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-400">
                Compte connecté
              </p>

              <p className="mt-3 font-black">
                {profil.nom_complet}
              </p>

              <p className="mt-1 text-sm text-neutral-400">
                {profil.matricule ||
                  "Matricule non attribué"}
              </p>

              <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-neutral-300">
                {service
                  ? `${service.code} — ${service.nom}`
                  : "Service non affecté"}
              </p>
            </div>

            <nav className="mt-5 space-y-2">
              <Link
                href="/admin/dashboard"
                className="flex items-center justify-between rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white"
              >
                Tableau de bord
                <span>DB</span>
              </Link>

              {modulesAutorises.map(
                (module) => (
                  <Link
                    key={module.href}
                    href={module.href}
                    className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-neutral-300 transition hover:bg-white/10 hover:text-white"
                  >
                    {module.titre}

                    <span className="text-[10px] font-black text-orange-400">
                      {module.code}
                    </span>
                  </Link>
                ),
              )}

              {estAdministrateur && (
                <Link
                  href="/admin/employes"
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-neutral-300 transition hover:bg-white/10 hover:text-white"
                >
                  Employés
                  <span className="text-[10px] font-black text-orange-400">
                    EMP
                  </span>
                </Link>
              )}

              {estAdministrateur && (
                <a
                  href="#parametres"
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-neutral-300 transition hover:bg-white/10 hover:text-white"
                >
                  Paramètres
                  <span className="text-[10px] font-black text-orange-400">
                    CFG
                  </span>
                </a>
              )}

              <Link
                href="/"
                className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-neutral-300 transition hover:bg-white/10 hover:text-white"
              >
                Retour au site public
                <span>←</span>
              </Link>
            </nav>

            <div className="mt-auto border-t border-white/10 pt-5">
              <button
                type="button"
                onClick={deconnecter}
                disabled={
                  deconnexionEnCours
                }
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
              >
                {deconnexionEnCours
                  ? "Déconnexion..."
                  : "Déconnexion"}
                <span>→</span>
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
            {erreur && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-800">
                {erreur}
              </div>
            )}

            <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-6 text-white shadow-xl sm:p-8">
              <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                    {LIBELLES_ROLES[
                      profil.role
                    ]}
                  </p>

                  <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                    Bonjour,{" "}
                    {profil.nom_complet}
                  </h1>

                  <p className="mt-4 max-w-2xl leading-7 text-neutral-300">
                    {estAdministrateur
                      ? "Vous disposez d’une vue générale et des outils d’administration de Province Connect."
                      : "Votre tableau de bord affiche uniquement les modules autorisés pour votre rôle et votre service."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:w-[430px]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-bold text-neutral-400">
                      Service
                    </p>

                    <p className="mt-2 font-black">
                      {service?.nom ||
                        "Non affecté"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-bold text-neutral-400">
                      Bureau
                    </p>

                    <p className="mt-2 font-black">
                      {profil.bureau ||
                        profil.commune ||
                        "Non précisé"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {statistiques.map(
                (statistique) => (
                  <Link
                    key={statistique.href}
                    href={statistique.href}
                    className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-extrabold text-neutral-500">
                          {statistique.titre}
                        </p>

                        <p className="mt-3 text-4xl font-black">
                          {statistique.valeur}
                        </p>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-950 text-[10px] font-black text-orange-400">
                        {statistique.code}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-neutral-500">
                      {statistique.description}
                    </p>
                  </Link>
                ),
              )}
            </section>

            <section className="mt-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                    Accès autorisés
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Modules de travail
                  </h2>
                </div>

                <p className="text-sm text-neutral-500">
                  {modulesAutorises.length} module(s)
                  disponible(s)
                </p>
              </div>

              {modulesAutorises.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-black/20 bg-white p-10 text-center">
                  <p className="font-black">
                    Aucun module attribué
                  </p>

                  <p className="mt-2 text-sm text-neutral-500">
                    Contactez l’administration pour
                    vérifier votre rôle et votre service.
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {modulesAutorises.map(
                    (module) => (
                      <Link
                        key={module.href}
                        href={module.href}
                        className="group rounded-[24px] border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl"
                      >
                        <div className="flex items-start justify-between gap-5">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-xs font-black text-orange-400 transition group-hover:bg-orange-500 group-hover:text-white">
                            {module.code}
                          </div>

                          <span className="text-xl transition group-hover:translate-x-1">
                            →
                          </span>
                        </div>

                        <h3 className="mt-5 text-xl font-black">
                          {module.titre}
                        </h3>

                        <p className="mt-2 leading-6 text-neutral-600">
                          {module.description}
                        </p>
                      </Link>
                    ),
                  )}

                  {estAdministrateur && (
                    <Link
                      href="/admin/employes"
                      className="group rounded-[24px] border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl"
                    >
                      <div className="flex items-start justify-between gap-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-xs font-black text-orange-400 transition group-hover:bg-orange-500 group-hover:text-white">
                          EMP
                        </div>

                        <span className="text-xl transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>

                      <h3 className="mt-5 text-xl font-black">
                        Employés
                      </h3>

                      <p className="mt-2 leading-6 text-neutral-600">
                        Créer les comptes, affecter les
                        services et contrôler les rôles.
                      </p>
                    </Link>
                  )}
                </div>
              )}
            </section>

            {(accesFinance ||
              accesCartes) && (
              <section className="mt-7 grid gap-5 xl:grid-cols-2">
                {accesFinance && (
                  <article className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">
                          Finances
                        </p>

                        <h2 className="mt-2 text-xl font-black">
                          Synthèse des encaissements
                        </h2>
                      </div>

                      <Link
                        href="/admin/paiements"
                        className="text-sm font-extrabold text-orange-600"
                      >
                        Ouvrir →
                      </Link>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-neutral-950 p-5 text-white">
                        <p className="text-sm text-neutral-400">
                          Total CDF
                        </p>

                        <p className="mt-3 text-2xl font-black">
                          {formaterMontant(
                            syntheseFinanciere.cdf,
                            "CDF",
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-green-800 p-5 text-white">
                        <p className="text-sm text-green-100">
                          Total USD
                        </p>

                        <p className="mt-3 text-2xl font-black">
                          {formaterMontant(
                            syntheseFinanciere.usd,
                            "USD",
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {derniersPaiements.length ===
                      0 ? (
                        <p className="rounded-xl bg-neutral-100 p-4 text-sm text-neutral-500">
                          Aucun paiement enregistré.
                        </p>
                      ) : (
                        derniersPaiements.map(
                          (paiement) => (
                            <div
                              key={paiement.id}
                              className="flex items-center justify-between gap-4 rounded-xl border border-black/5 p-4"
                            >
                              <div>
                                <p className="font-bold">
                                  {paiement.payeurNom ||
                                    paiement.numero ||
                                    "Paiement"}
                                </p>

                                <p className="mt-1 text-xs text-neutral-500">
                                  {paiement.taxeNom ||
                                    formaterDate(
                                      paiement.datePaiement,
                                    )}
                                </p>
                              </div>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${classeStatut(
                                  paiement.statut,
                                )}`}
                              >
                                {paiement.statut}
                              </span>
                            </div>
                          ),
                        )
                      )}
                    </div>
                  </article>
                )}

                {accesCartes && (
                  <article className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">
                          Documents
                        </p>

                        <h2 className="mt-2 text-xl font-black">
                          Cartes récentes
                        </h2>
                      </div>

                      <Link
                        href="/admin/cartes"
                        className="text-sm font-extrabold text-orange-600"
                      >
                        Ouvrir →
                      </Link>
                    </div>

                    <div className="mt-5 space-y-3">
                      {derniersDocuments.length ===
                      0 ? (
                        <p className="rounded-xl bg-neutral-100 p-4 text-sm text-neutral-500">
                          Aucune carte enregistrée.
                        </p>
                      ) : (
                        derniersDocuments.map(
                          (carte) => (
                            <div
                              key={carte.id}
                              className="flex items-center justify-between gap-4 rounded-xl border border-black/5 p-4"
                            >
                              <div>
                                <p className="font-bold">
                                  {carte.titulaireNom ||
                                    carte.numeroDocument ||
                                    "Document"}
                                </p>

                                <p className="mt-1 text-xs text-neutral-500">
                                  {carte.typeDocumentNom ||
                                    formaterDate(
                                      carte.dateDelivrance,
                                    )}
                                </p>
                              </div>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${classeStatut(
                                  carte.statut,
                                )}`}
                              >
                                {carte.statut}
                              </span>
                            </div>
                          ),
                        )
                      )}
                    </div>
                  </article>
                )}
              </section>
            )}

            {estAdministrateur && (
              <section
                id="parametres"
                className="mt-7 scroll-mt-24 rounded-[28px] border border-black/10 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                      Paramètres
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      Administration du système
                    </h2>

                    <p className="mt-3 max-w-3xl leading-7 text-neutral-600">
                      Gérez les employés, contrôlez les
                      services et préparez la migration des
                      données locales vers la base centrale
                      Supabase.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/admin/employes"
                      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-neutral-950 px-5 font-extrabold text-white transition hover:bg-orange-500"
                    >
                      Gérer les employés
                    </Link>

                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="inline-flex min-h-12 items-center justify-center rounded-xl border border-black/10 px-5 font-extrabold transition hover:bg-neutral-100"
                    >
                      Recharger l’interface
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MiniParametre
                    titre="Services actifs"
                    valeur="7"
                  />

                  <MiniParametre
                    titre="Taxes configurées"
                    valeur={formaterNombre(
                      nombreTaxes,
                    )}
                  />

                  <MiniParametre
                    titre="Reçus enregistrés"
                    valeur={formaterNombre(
                      nombreRecus,
                    )}
                  />

                  <MiniParametre
                    titre="Communiqués publiés"
                    valeur={formaterNombre(
                      communiques.filter(
                        (communique) =>
                          communique.statut ===
                          "Publié",
                      ).length,
                    )}
                  />
                </div>
              </section>
            )}
          </div>
        </section>
      </div>

      {menuMobileOuvert && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden">
          <div className="h-full w-[88%] max-w-sm overflow-y-auto bg-neutral-950 p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="font-black">
                Province Connect
              </p>

              <button
                type="button"
                onClick={() =>
                  setMenuMobileOuvert(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"
                aria-label="Fermer le menu"
              >
                ×
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-black">
                {profil.nom_complet}
              </p>

              <p className="mt-1 text-sm text-neutral-400">
                {LIBELLES_ROLES[
                  profil.role
                ]}
              </p>
            </div>

            <nav className="mt-5 space-y-2">
              <Link
                href="/admin/dashboard"
                onClick={() =>
                  setMenuMobileOuvert(false)
                }
                className="flex items-center justify-between rounded-xl bg-orange-500 px-4 py-3 font-black"
              >
                Tableau de bord
                <span>DB</span>
              </Link>

              {modulesAutorises.map(
                (module) => (
                  <Link
                    key={module.href}
                    href={module.href}
                    onClick={() =>
                      setMenuMobileOuvert(false)
                    }
                    className="flex items-center justify-between rounded-xl px-4 py-3 font-bold text-neutral-300 hover:bg-white/10"
                  >
                    {module.titre}
                    <span>{module.code}</span>
                  </Link>
                ),
              )}

              {estAdministrateur && (
                <Link
                  href="/admin/employes"
                  onClick={() =>
                    setMenuMobileOuvert(false)
                  }
                  className="flex items-center justify-between rounded-xl px-4 py-3 font-bold text-neutral-300 hover:bg-white/10"
                >
                  Employés
                  <span>EMP</span>
                </Link>
              )}

              {estAdministrateur && (
                <a
                  href="#parametres"
                  onClick={() =>
                    setMenuMobileOuvert(false)
                  }
                  className="flex items-center justify-between rounded-xl px-4 py-3 font-bold text-neutral-300 hover:bg-white/10"
                >
                  Paramètres
                  <span>CFG</span>
                </a>
              )}

              <Link
                href="/"
                onClick={() =>
                  setMenuMobileOuvert(false)
                }
                className="flex items-center justify-between rounded-xl px-4 py-3 font-bold text-neutral-300 hover:bg-white/10"
              >
                Retour au site public
                <span>←</span>
              </Link>
            </nav>

            <button
              type="button"
              onClick={deconnecter}
              disabled={
                deconnexionEnCours
              }
              className="mt-8 flex w-full items-center justify-between rounded-xl border border-red-500/20 px-4 py-3 font-bold text-red-300"
            >
              {deconnexionEnCours
                ? "Déconnexion..."
                : "Déconnexion"}
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function MiniParametre({
  titre,
  valeur,
}: {
  titre: string;
  valeur: string;
}) {
  return (
    <article className="rounded-2xl bg-neutral-100 p-4">
      <p className="text-sm font-bold text-neutral-500">
        {titre}
      </p>

      <p className="mt-2 text-2xl font-black">
        {valeur}
      </p>
    </article>
  );
}
