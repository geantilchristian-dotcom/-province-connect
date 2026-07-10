"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "../../../lib/supabase/client";

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
  role: RoleEmploye;
  statut:
    | "invite"
    | "actif"
    | "suspendu"
    | "desactive";
  service_id: string | null;
};

const ROLES_ADMINISTRATEURS: RoleEmploye[] = [
  "super_admin",
  "admin_provincial",
];

function destinationSelonRole(role: RoleEmploye) {
  return ROLES_ADMINISTRATEURS.includes(role)
    ? "/admin/dashboard"
    : "/employe/dashboard";
}

function traduireErreurConnexion(message: string) {
  const texte = message.toLowerCase();

  if (
    texte.includes("invalid login credentials") ||
    texte.includes("invalid credentials")
  ) {
    return "Adresse e-mail ou mot de passe incorrect.";
  }

  if (texte.includes("email not confirmed")) {
    return "Cette adresse e-mail n’a pas encore été confirmée.";
  }

  if (texte.includes("too many requests")) {
    return "Trop de tentatives. Patientez quelques minutes avant de recommencer.";
  }

  return "La connexion a échoué. Vérifiez vos informations et réessayez.";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [afficherMotDePasse, setAfficherMotDePasse] =
    useState(false);
  const [connexionEnCours, setConnexionEnCours] =
    useState(false);
  const [verificationSession, setVerificationSession] =
    useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let actif = true;

    async function verifierSession() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!actif) {
          return;
        }

        if (!user) {
          setVerificationSession(false);
          return;
        }

        const { data: profil } = await supabase
          .from("profils")
          .select(
            "id, matricule, nom_complet, role, statut, service_id",
          )
          .eq("id", user.id)
          .maybeSingle<ProfilEmploye>();

        if (!actif) {
          return;
        }

        if (profil?.statut === "actif") {
          router.replace(
            destinationSelonRole(profil.role),
          );
          router.refresh();
          return;
        }

        await supabase.auth.signOut({
          scope: "local",
        });

        setVerificationSession(false);
      } catch {
        if (actif) {
          setVerificationSession(false);
        }
      }
    }

    void verifierSession();

    return () => {
      actif = false;
    };
  }, [router, supabase]);

  async function connecter(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErreur("");

    const emailNettoye = email.trim().toLowerCase();

    if (!emailNettoye) {
      setErreur("Veuillez saisir votre adresse e-mail.");
      return;
    }

    if (!motDePasse) {
      setErreur("Veuillez saisir votre mot de passe.");
      return;
    }

    setConnexionEnCours(true);

    try {
      const {
        data: connexion,
        error: erreurConnexion,
      } = await supabase.auth.signInWithPassword({
        email: emailNettoye,
        password: motDePasse,
      });

      if (erreurConnexion) {
        setErreur(
          traduireErreurConnexion(
            erreurConnexion.message,
          ),
        );
        return;
      }

      if (!connexion.user) {
        setErreur(
          "La connexion n’a pas pu être confirmée.",
        );
        return;
      }

      const {
        data: profil,
        error: erreurProfil,
      } = await supabase
        .from("profils")
        .select(
          "id, matricule, nom_complet, role, statut, service_id",
        )
        .eq("id", connexion.user.id)
        .maybeSingle<ProfilEmploye>();

      if (erreurProfil || !profil) {
        await supabase.auth.signOut({
          scope: "local",
        });

        setErreur(
          "Le profil professionnel de ce compte est introuvable.",
        );
        return;
      }

      if (profil.statut !== "actif") {
        await supabase.auth.signOut({
          scope: "local",
        });

        if (profil.statut === "invite") {
          setErreur(
            "Ce compte n’a pas encore été activé.",
          );
        } else if (
          profil.statut === "suspendu"
        ) {
          setErreur("Ce compte est suspendu.");
        } else {
          setErreur("Ce compte est désactivé.");
        }

        return;
      }

      router.replace(
        destinationSelonRole(profil.role),
      );
      router.refresh();
    } catch {
      setErreur(
        "Une erreur inattendue empêche la connexion.",
      );
    } finally {
      setConnexionEnCours(false);
    }
  }

  if (verificationSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-white">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-orange-500 text-sm font-black">
            PC
          </div>

          <p className="mt-5 font-extrabold">
            Vérification de la session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-black via-neutral-950 to-green-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -left-40 top-0 h-[450px] w-[450px] rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-green-600/20 blur-3xl" />

          <Link
            href="/"
            className="relative inline-flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-sm font-black">
              PC
            </div>

            <div>
              <p className="text-lg font-black">
                Province Connect
              </p>

              <p className="text-xs text-neutral-400">
                Registre Provincial Numérique
              </p>
            </div>
          </Link>

          <div className="relative max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">
              Connexion sécurisée
            </p>

            <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-[-0.045em] xl:text-6xl">
              Un seul accès, une interface adaptée au rôle
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-300">
              Le système reconnaît automatiquement le compte
              connecté et ouvre soit l’administration générale,
              soit l’espace limité de l’employé.
            </p>
          </div>

          <p className="relative text-sm text-neutral-500">
            © 2026 Province Connect
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-lg">
            <div className="rounded-[30px] border border-black/10 bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
                Accès professionnel
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight">
                Se connecter
              </h2>

              <p className="mt-4 leading-7 text-neutral-600">
                Utilisez les identifiants attribués à votre
                compte.
              </p>

              <form
                onSubmit={connecter}
                className="mt-7 space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-extrabold"
                  >
                    Adresse e-mail
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setErreur("");
                    }}
                    autoComplete="email"
                    placeholder="nom@province.cd"
                    className="min-h-14 w-full rounded-2xl border border-black/15 bg-neutral-50 px-5 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="mot-de-passe"
                    className="mb-2 block text-sm font-extrabold"
                  >
                    Mot de passe
                  </label>

                  <div className="relative">
                    <input
                      id="mot-de-passe"
                      type={
                        afficherMotDePasse
                          ? "text"
                          : "password"
                      }
                      value={motDePasse}
                      onChange={(event) => {
                        setMotDePasse(event.target.value);
                        setErreur("");
                      }}
                      autoComplete="current-password"
                      placeholder="Votre mot de passe"
                      className="min-h-14 w-full rounded-2xl border border-black/15 bg-neutral-50 px-5 pr-28 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setAfficherMotDePasse(
                          (ancienneValeur) =>
                            !ancienneValeur,
                        )
                      }
                      className="absolute inset-y-2 right-2 rounded-xl px-4 text-xs font-extrabold text-neutral-600 hover:bg-neutral-200"
                    >
                      {afficherMotDePasse
                        ? "Masquer"
                        : "Afficher"}
                    </button>
                  </div>
                </div>

                {erreur && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-800"
                  >
                    {erreur}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={connexionEnCours}
                  className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-orange-500 px-6 font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
                >
                  {connexionEnCours
                    ? "Connexion en cours..."
                    : "Se connecter"}
                </button>
              </form>

              <Link
                href="/"
                className="mt-6 inline-flex text-sm font-extrabold text-orange-600"
              >
                ← Retour au site public
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
