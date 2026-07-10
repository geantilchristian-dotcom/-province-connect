"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "../../lib/supabase/client";

type StatutCarte =
  | "Brouillon"
  | "Valide"
  | "Expiré"
  | "Suspendu"
  | "Révoqué";

type CarteProvinciale = {
  id: string;
  numeroDocument: string;

  personneId: string;
  titulaireNom: string;
  titulaireNumero: string;

  activiteId: string;
  activiteNom: string;

  typeDocumentCode: string;
  typeDocumentNom: string;
  categorieDocument: string;

  dateDelivrance: string;
  dateExpiration: string;

  communeDelivrance: string;
  autoriteDelivrante: string;
  observations: string;

  statut: StatutCarte;

  createdAt: string;
  updatedAt: string;
};

const CLE_CARTES = "province-connect-cartes";

function normaliserNumero(numero: string) {
  return numero
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function obtenirDateAujourdhui() {
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = String(maintenant.getMonth() + 1).padStart(2, "0");
  const jour = String(maintenant.getDate()).padStart(2, "0");

  return `${annee}-${mois}-${jour}`;
}

function obtenirStatutEffectif(
  carte: CarteProvinciale,
): StatutCarte {
  if (
    carte.statut === "Valide" &&
    carte.dateExpiration &&
    carte.dateExpiration < obtenirDateAujourdhui()
  ) {
    return "Expiré";
  }

  return carte.statut;
}

function formaterDate(date: string) {
  if (!date) {
    return "Non renseignée";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function obtenirStyleStatut(statut: StatutCarte) {
  if (statut === "Valide") {
    return {
      badge: "bg-green-100 text-green-800",
      bordure: "border-green-500",
      fond: "bg-green-50",
      texte: "Document valide",
      description:
        "Ce document est reconnu comme valide dans le registre provincial.",
    };
  }

  if (statut === "Expiré") {
    return {
      badge: "bg-purple-100 text-purple-800",
      bordure: "border-purple-500",
      fond: "bg-purple-50",
      texte: "Document expiré",
      description:
        "La période de validité de ce document est terminée.",
    };
  }

  if (statut === "Suspendu") {
    return {
      badge: "bg-yellow-100 text-yellow-800",
      bordure: "border-yellow-500",
      fond: "bg-yellow-50",
      texte: "Document suspendu",
      description:
        "Ce document est temporairement suspendu par l’administration.",
    };
  }

  if (statut === "Révoqué") {
    return {
      badge: "bg-red-100 text-red-800",
      bordure: "border-red-500",
      fond: "bg-red-50",
      texte: "Document révoqué",
      description:
        "Ce document n’est plus reconnu comme valide par l’administration.",
    };
  }

  return {
    badge: "bg-neutral-200 text-neutral-700",
    bordure: "border-neutral-400",
    fond: "bg-neutral-100",
    texte: "Document en brouillon",
    description:
      "Ce document n’est pas encore accessible au public.",
  };
}

export default function VerificationPage() {
  const supabase = useMemo(() => createClient(), []);
  const [numero, setNumero] = useState("");

  const [resultat, setResultat] =
    useState<CarteProvinciale | null>(null);

  const [rechercheEffectuee, setRechercheEffectuee] =
    useState(false);

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const parametres = new URLSearchParams(
      window.location.search,
    );

    const numeroDansAdresse = parametres.get("numero") || "";

    if (numeroDansAdresse) {
      const numeroNettoye = normaliserNumero(numeroDansAdresse);
      setNumero(numeroNettoye);
      void rechercherDocument(numeroNettoye, false);
    } else {
      setChargement(false);
    }
  }, []);

  async function rechercherDocument(
    valeur: string,
    modifierAdresse = true,
  ) {
    const numeroNettoye = normaliserNumero(valeur);

    setNumero(numeroNettoye);
    setErreur("");

    if (!numeroNettoye) {
      setResultat(null);
      setRechercheEffectuee(false);
      setChargement(false);
      setErreur(
        "Veuillez saisir le numéro inscrit sur le document.",
      );
      return;
    }

    setChargement(true);

    const { data, error } = await supabase.rpc(
      "verifier_document_public",
      {
        numero_recherche: numeroNettoye,
      },
    );

    if (error) {
      setResultat(null);
      setRechercheEffectuee(false);
      setErreur(
        "Le service de vérification est momentanément indisponible.",
      );
      setChargement(false);
      return;
    }

    setResultat((data as CarteProvinciale | null) || null);
    setRechercheEffectuee(true);
    setChargement(false);

    if (modifierAdresse) {
      const nouvelleAdresse =
        `${window.location.pathname}?numero=` +
        encodeURIComponent(numeroNettoye);

      window.history.replaceState({}, "", nouvelleAdresse);
    }
  }

  function soumettreRecherche(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    rechercherDocument(numero);
  }

  function nouvelleRecherche() {
    setNumero("");
    setResultat(null);
    setRechercheEffectuee(false);
    setErreur("");

    window.history.replaceState(
      {},
      "",
      window.location.pathname,
    );
  }

  const statutEffectif = resultat
    ? obtenirStatutEffectif(resultat)
    : null;

  const styleStatut = statutEffectif
    ? obtenirStyleStatut(statutEffectif)
    : null;

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      {/* Barre de navigation */}
      <header className="sticky top-0 z-40 border-b border-orange-600 bg-orange-500 shadow-md">
        <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-xs font-black text-white shadow-lg">
              PC
            </div>

            <div className="min-w-0">
              <p className="truncate font-black text-black">
                Province Connect
              </p>

              <p className="truncate text-xs font-semibold text-black/65">
                Vérification publique
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-extrabold text-white transition hover:bg-green-800 sm:px-5"
          >
            <span>←</span>
            <span className="hidden sm:inline">
              Retour à l’accueil
            </span>
            <span className="sm:hidden">Accueil</span>
          </Link>
        </div>
      </header>

      {/* Présentation */}
      <section className="relative overflow-hidden bg-gradient-to-br from-black via-neutral-950 to-green-950">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-green-600/20 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-[1600px] gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">
              Service public sécurisé
            </p>

            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.08] tracking-[-0.04em] text-white md:text-5xl lg:text-6xl">
              Vérifiez l’authenticité d’un document provincial
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-neutral-300 md:text-lg">
              Saisissez le numéro inscrit sur une carte, un
              permis ou une autorisation pour connaître son
              statut officiel.
            </p>

            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />

              <p className="text-sm leading-6 text-neutral-300">
                Le téléphone, l’adresse et les autres
                informations privées du titulaire ne sont pas
                affichés.
              </p>
            </div>
          </div>

          {/* Formulaire */}
          <div className="rounded-[30px] bg-white p-6 shadow-2xl shadow-black/40 md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-green-700">
                  Recherche officielle
                </p>

                <h2 className="mt-3 text-2xl font-black tracking-tight text-black md:text-3xl">
                  Numéro du document
                </h2>
              </div>

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black font-black text-white">
                QR
              </div>
            </div>

            <p className="mt-4 leading-7 text-neutral-600">
              Recopiez exactement le numéro visible sur le
              document provincial.
            </p>

            <form
              onSubmit={soumettreRecherche}
              className="mt-7"
            >
              <label
                htmlFor="numero-document"
                className="mb-2 block text-sm font-extrabold text-black"
              >
                Numéro officiel
              </label>

              <input
                id="numero-document"
                type="text"
                value={numero}
                onChange={(event) => {
                  setNumero(
                    event.target.value.toUpperCase(),
                  );

                  setErreur("");
                  setRechercheEffectuee(false);
                  setResultat(null);
                }}
                placeholder="Exemple : PC-COM-2026-000001"
                autoComplete="off"
                spellCheck={false}
                className="min-h-14 w-full rounded-2xl border border-black/15 bg-neutral-50 px-5 font-extrabold uppercase tracking-wide text-black outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-neutral-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />

              {erreur && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800"
                >
                  {erreur}
                </div>
              )}

              <button
                type="submit"
                disabled={chargement}
                className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                {chargement
                  ? "Chargement du registre..."
                  : "Vérifier le document"}

                {!chargement && <span>→</span>}
              </button>
            </form>

            <p className="mt-5 text-center text-xs leading-5 text-neutral-400">
              Les résultats sont fournis à titre de
              vérification administrative.
            </p>
          </div>
        </div>
      </section>

      {/* Résultat */}
      <section className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        {!rechercheEffectuee && !chargement && (
          <div className="rounded-[28px] border border-dashed border-black/15 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 font-black text-neutral-500">
              DOC
            </div>

            <h2 className="mt-5 text-2xl font-black text-black">
              Prêt pour la vérification
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-neutral-500">
              Entrez le numéro officiel du document dans le
              formulaire ci-dessus.
            </p>
          </div>
        )}

        {rechercheEffectuee && !resultat && (
          <div className="rounded-[28px] border border-red-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-xl font-black text-red-700">
                ×
              </div>

              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
                  Résultat de la recherche
                </p>

                <h2 className="mt-3 text-2xl font-black text-black md:text-3xl">
                  Document introuvable
                </h2>

                <p className="mt-4 max-w-3xl leading-7 text-neutral-600">
                  Aucun document public ne correspond au numéro
                  <strong className="text-black">
                    {" "}
                    {normaliserNumero(numero)}
                  </strong>
                  . Vérifiez les caractères saisis ou contactez
                  l’administration provinciale.
                </p>

                <button
                  type="button"
                  onClick={nouvelleRecherche}
                  className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-extrabold text-white transition hover:bg-orange-500"
                >
                  Faire une autre recherche
                </button>
              </div>
            </div>
          </div>
        )}

        {resultat && statutEffectif && styleStatut && (
          <article className="overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-xl">
            <div
              className={`border-l-8 ${styleStatut.bordure} ${styleStatut.fond} p-6 md:p-8`}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                    Résultat officiel
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-tight text-black">
                    {styleStatut.texte}
                  </h2>

                  <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
                    {styleStatut.description}
                  </p>
                </div>

                <span
                  className={`inline-flex self-start rounded-full px-5 py-2.5 text-sm font-black ${styleStatut.badge}`}
                >
                  {statutEffectif}
                </span>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="flex flex-col gap-5 border-b border-black/10 pb-7 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
                    Numéro officiel
                  </p>

                  <p className="mt-2 break-all text-2xl font-black text-black md:text-3xl">
                    {resultat.numeroDocument}
                  </p>
                </div>

                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-black text-lg font-black text-white">
                  QR
                </div>
              </div>

              <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <InformationPublique
                  label="Type de document"
                  valeur={resultat.typeDocumentNom}
                />

                <InformationPublique
                  label="Catégorie"
                  valeur={resultat.categorieDocument}
                />

                <InformationPublique
                  label="Titulaire"
                  valeur={resultat.titulaireNom}
                />

                <InformationPublique
                  label="Activité liée"
                  valeur={
                    resultat.activiteNom ||
                    "Aucune activité liée"
                  }
                />

                <InformationPublique
                  label="Délivré le"
                  valeur={formaterDate(
                    resultat.dateDelivrance,
                  )}
                />

                <InformationPublique
                  label="Expire le"
                  valeur={formaterDate(
                    resultat.dateExpiration,
                  )}
                />

                <InformationPublique
                  label="Commune de délivrance"
                  valeur={resultat.communeDelivrance}
                />

                <InformationPublique
                  label="Autorité de délivrance"
                  valeur={resultat.autoriteDelivrante}
                />

                <InformationPublique
                  label="Statut actuel"
                  valeur={statutEffectif}
                />
              </div>

              <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-neutral-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-extrabold text-black">
                    Vérification terminée
                  </p>

                  <p className="mt-1 text-sm leading-6 text-neutral-600">
                    Aucune information privée supplémentaire
                    n’est communiquée publiquement.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={nouvelleRecherche}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-black px-5 text-sm font-extrabold text-white transition hover:bg-orange-500"
                >
                  Nouvelle recherche
                </button>
              </div>
            </div>
          </article>
        )}
      </section>

      {/* Pied de page */}
      <footer className="bg-black text-white">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col justify-between gap-6 px-4 py-9 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-xs font-black">
              PC
            </div>

            <div>
              <p className="font-black">Province Connect</p>

              <p className="mt-1 text-xs text-neutral-400">
                Registre Provincial Numérique
              </p>
            </div>
          </div>

          <p className="text-sm text-neutral-400">
            © 2026 Province Connect. Service public de
            vérification.
          </p>
        </div>
      </footer>
    </main>
  );
}

type InformationPubliqueProps = {
  label: string;
  valeur: string;
};

function InformationPublique({
  label,
  valeur,
}: InformationPubliqueProps) {
  return (
    <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
        {label}
      </p>

      <p className="mt-2 font-extrabold leading-6 text-black">
        {valeur}
      </p>
    </div>
  );
}