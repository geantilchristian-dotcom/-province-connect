"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

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

type ProfilEmploye = {
  id: string;
  matricule: string | null;
  nom_complet: string;
  email: string;
  role: RoleEmploye;
  statut:
    | "invite"
    | "actif"
    | "suspendu"
    | "desactive";
  service_id: string | null;
  commune: string | null;
  bureau: string | null;
};

type ServiceEmploye = {
  id: string;
  code: string;
  nom: string;
};

type ModuleEmploye = {
  titre: string;
  description: string;
  href: string;
  code: string;
};

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

function modulesSelonCompte(
  role: RoleEmploye,
  codeService: string | null,
): ModuleEmploye[] {
  if (role === "agent_enregistrement") {
    return [
      {
        titre: "Personnes",
        description:
          "Enregistrer et consulter les dossiers des personnes.",
        href: "/admin/personnes",
        code: "PER",
      },
      {
        titre: "Activités",
        description:
          "Enregistrer les activités et leurs responsables.",
        href: "/admin/activites",
        code: "ACT",
      },
    ];
  }

  if (role === "agent_cartes") {
    return [
      {
        titre: "Cartes et permis",
        description:
          "Créer, renouveler et imprimer les documents autorisés.",
        href: "/admin/cartes",
        code: "CAR",
      },
    ];
  }

  if (role === "caissier") {
    return [
      {
        titre: "Taxes",
        description:
          "Consulter les taxes et tarifs applicables.",
        href: "/admin/taxes",
        code: "TAX",
      },
      {
        titre: "Paiements",
        description:
          "Enregistrer et consulter les encaissements.",
        href: "/admin/paiements",
        code: "PAY",
      },
      {
        titre: "Reçus",
        description:
          "Consulter et imprimer les reçus numériques.",
        href: "/admin/recus",
        code: "REC",
      },
    ];
  }

  if (role === "agent_communication") {
    return [
      {
        titre: "Communiqués",
        description:
          "Préparer et publier les informations officielles.",
        href: "/admin/communiques",
        code: "COM",
      },
    ];
  }

  if (role === "agent_controle") {
    return [
      {
        titre: "Vérifier un document",
        description:
          "Contrôler une carte ou un permis provincial.",
        href: "/verification",
        code: "VER",
      },
      {
        titre: "Vérifier un reçu",
        description:
          "Contrôler l’authenticité d’un reçu numérique.",
        href: "/verification-recu",
        code: "REC",
      },
    ];
  }

  if (role === "chef_service") {
    const modulesParService: Record<
      string,
      ModuleEmploye[]
    > = {
      ENR: [
        {
          titre: "Personnes",
          description:
            "Superviser les dossiers d’enregistrement.",
          href: "/admin/personnes",
          code: "PER",
        },
        {
          titre: "Activités",
          description:
            "Superviser les activités enregistrées.",
          href: "/admin/activites",
          code: "ACT",
        },
      ],
      ACT: [
        {
          titre: "Activités",
          description:
            "Superviser les activités et autorisations.",
          href: "/admin/activites",
          code: "ACT",
        },
      ],
      CAR: [
        {
          titre: "Cartes et permis",
          description:
            "Superviser les cartes, permis et renouvellements.",
          href: "/admin/cartes",
          code: "CAR",
        },
      ],
      FIN: [
        {
          titre: "Taxes",
          description:
            "Superviser les taxes provinciales.",
          href: "/admin/taxes",
          code: "TAX",
        },
        {
          titre: "Paiements",
          description:
            "Superviser les encaissements.",
          href: "/admin/paiements",
          code: "PAY",
        },
        {
          titre: "Reçus",
          description:
            "Superviser les reçus numériques.",
          href: "/admin/recus",
          code: "REC",
        },
      ],
      COM: [
        {
          titre: "Communiqués",
          description:
            "Superviser les publications officielles.",
          href: "/admin/communiques",
          code: "COM",
        },
      ],
      CTR: [
        {
          titre: "Vérifier un document",
          description:
            "Contrôler une carte ou un permis provincial.",
          href: "/verification",
          code: "VER",
        },
        {
          titre: "Vérifier un reçu",
          description:
            "Contrôler l’authenticité d’un reçu numérique.",
          href: "/verification-recu",
          code: "REC",
        },
      ],
    };

    return codeService
      ? modulesParService[codeService] || []
      : [];
  }

  return [];
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

export default function EmployeDashboardPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [profil, setProfil] =
    useState<ProfilEmploye | null>(null);

  const [service, setService] =
    useState<ServiceEmploye | null>(null);

  const [chargement, setChargement] =
    useState(true);

  const [
    deconnexionEnCours,
    setDeconnexionEnCours,
  ] = useState(false);

  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let actif = true;

    async function chargerProfil() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!actif) {
          return;
        }

        if (!user) {
          router.replace("/admin/login");
          router.refresh();
          return;
        }

        const {
          data: profilTrouve,
          error: erreurProfil,
        } = await supabase
          .from("profils")
          .select(
            "id, matricule, nom_complet, email, role, statut, service_id, commune, bureau",
          )
          .eq("id", user.id)
          .maybeSingle<ProfilEmploye>();

        if (
          erreurProfil ||
          !profilTrouve ||
          profilTrouve.statut !== "actif"
        ) {
          await supabase.auth.signOut({
            scope: "local",
          });

          router.replace("/admin/login");
          router.refresh();
          return;
        }

        if (
          ROLES_ADMINISTRATEURS.includes(
            profilTrouve.role,
          )
        ) {
          router.replace("/admin/dashboard");
          router.refresh();
          return;
        }

        setProfil(profilTrouve);

        if (profilTrouve.service_id) {
          const { data: serviceTrouve } =
            await supabase
              .from("services")
              .select("id, code, nom")
              .eq(
                "id",
                profilTrouve.service_id,
              )
              .maybeSingle<ServiceEmploye>();

          if (actif) {
            setService(serviceTrouve || null);
          }
        }
      } catch {
        if (actif) {
          setErreur(
            "Impossible de charger votre espace professionnel.",
          );
        }
      } finally {
        if (actif) {
          setChargement(false);
        }
      }
    }

    void chargerProfil();

    return () => {
      actif = false;
    };
  }, [router, supabase]);

  const modules = useMemo(() => {
    if (!profil) {
      return [];
    }

    return modulesSelonCompte(
      profil.role,
      service?.code || null,
    );
  }, [profil, service]);

  async function deconnecter() {
    if (deconnexionEnCours) {
      return;
    }

    setDeconnexionEnCours(true);

    try {
      await supabase.auth.signOut({
        scope: "local",
      });

      window.location.replace(
        "/admin/login",
      );
    } catch {
      setErreur(
        "La déconnexion a échoué.",
      );
      setDeconnexionEnCours(false);
    }
  }

  if (chargement) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
        <p className="font-extrabold">
          Chargement de l’espace employé...
        </p>
      </main>
    );
  }

  if (!profil) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/employe/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-xs font-black text-white">
              PC
            </div>

            <div>
              <p className="font-black">
                Province Connect
              </p>

              <p className="text-xs text-neutral-500">
                Espace employé
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <NotificationButton />

            <button
              type="button"
              onClick={deconnecter}
              disabled={deconnexionEnCours}
              className="rounded-xl bg-neutral-950 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {deconnexionEnCours
                ? "Déconnexion..."
                : "Déconnexion"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {erreur && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-800">
            {erreur}
          </div>
        )}

        <section className="overflow-hidden rounded-[30px] bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                {LIBELLES_ROLES[profil.role]}
              </p>

              <h1 className="mt-4 text-3xl font-black sm:text-5xl">
                Bonjour, {profil.nom_complet}
              </h1>

              <p className="mt-4 max-w-2xl leading-7 text-neutral-300">
                Cet espace est limité aux fonctions attribuées
                à votre rôle et à votre service.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 font-black">
                  {obtenirInitiales(
                    profil.nom_complet,
                  )}
                </div>

                <div>
                  <p className="font-black">
                    {profil.matricule ||
                      "Matricule non attribué"}
                  </p>

                  <p className="mt-1 text-sm text-neutral-400">
                    {service
                      ? `${service.code} — ${service.nom}`
                      : "Service non affecté"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
            Fonctions autorisées
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Votre espace de travail
          </h2>

          {modules.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-black/20 bg-white p-10 text-center">
              <p className="font-black">
                Aucun module n’est encore attribué
              </p>

              <p className="mt-2 text-sm text-neutral-500">
                Contactez le Super administrateur.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {modules.map((module) => (
                <Link
                  key={`${module.href}-${module.code}`}
                  href={module.href}
                  className="group rounded-[26px] border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-xs font-black text-orange-400 group-hover:bg-orange-500 group-hover:text-white">
                      {module.code}
                    </div>

                    <span className="text-xl">→</span>
                  </div>

                  <h3 className="mt-5 text-xl font-black">
                    {module.titre}
                  </h3>

                  <p className="mt-2 leading-6 text-neutral-600">
                    {module.description}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center rounded-xl border border-black/10 bg-white px-5 font-extrabold hover:bg-neutral-200"
          >
            ← Retour au site public
          </Link>

          <div className="inline-flex min-h-12 items-center rounded-xl bg-neutral-200 px-5 text-sm font-bold text-neutral-600">
            Aucun accès aux employés, paramètres ou fonctions
            administratives
          </div>
        </div>
      </div>
    </main>
  );
}