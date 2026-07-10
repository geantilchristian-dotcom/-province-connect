"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "../../lib/supabase/client";

type Devise = "CDF" | "USD";

type StatutRecu =
  | "Valide"
  | "Paiement partiel"
  | "Annulé"
  | "Remboursé";

type RecuNumerique = {
  id: string;
  numeroRecu: string;
  codeVerification: string;

  paiementId: string;
  numeroPaiement: string;

  personneId: string;
  payeurNom: string;
  payeurNumero: string;

  activiteId: string;
  activiteNom: string;
  activiteNumero: string;

  taxeId: string;
  taxeNumero: string;
  taxeNom: string;
  taxeCategorie: string;
  taxeFrequence: string;

  montantDu: number;
  montantPaye: number;
  resteAPayer: number;
  devise: Devise;

  modePaiement: string;
  referenceTransaction: string;

  datePaiement: string;
  dateEmission: string;
  periodeConcernee: string;

  agentEncaisseur: string;
  bureauEncaissement: string;
  observations: string;

  statut: StatutRecu;

  createdAt: string;
  updatedAt: string;
};

type StyleStatut = {
  titre: string;
  description: string;
  badge: string;
  bordure: string;
  fond: string;
  icone: string;
};

const CLE_RECUS = "province-connect-recus";

function normaliserValeur(valeur: string) {
  return valeur
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function formaterMontant(
  montant: number,
  devise: Devise,
) {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: devise === "USD" ? 2 : 0,
    maximumFractionDigits: devise === "USD" ? 2 : 0,
  }).format(montant)} ${devise}`;
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

function masquerNom(nomComplet: string) {
  const parties = nomComplet
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parties.length === 0) {
    return "Non renseigné";
  }

  return parties
    .map((partie) => {
      if (partie.length <= 1) {
        return `${partie.toUpperCase()}***`;
      }

      return `${partie.charAt(0).toUpperCase()}${"*".repeat(
        Math.min(partie.length - 1, 5),
      )}`;
    })
    .join(" ");
}

function obtenirStyleStatut(
  statut: StatutRecu,
): StyleStatut {
  if (statut === "Valide") {
    return {
      titre: "Reçu authentique et valide",
      description:
        "Ce reçu existe dans le registre provincial et correspond à un paiement confirmé.",
      badge: "bg-green-100 text-green-800",
      bordure: "border-green-500",
      fond: "bg-green-50",
      icone: "✓",
    };
  }

  if (statut === "Paiement partiel") {
    return {
      titre: "Reçu authentique — paiement partiel",
      description:
        "Ce reçu existe dans le registre provincial, mais le montant total reste partiellement dû.",
      badge: "bg-orange-100 text-orange-800",
      bordure: "border-orange-500",
      fond: "bg-orange-50",
      icone: "!",
    };
  }

  if (statut === "Remboursé") {
    return {
      titre: "Reçu remboursé",
      description:
        "Ce reçu est authentique, mais le paiement correspondant a été marqué comme remboursé.",
      badge: "bg-purple-100 text-purple-800",
      bordure: "border-purple-500",
      fond: "bg-purple-50",
      icone: "↺",
    };
  }

  return {
    titre: "Reçu annulé",
    description:
      "Ce reçu existe dans le registre, mais il a été annulé par l’administration provinciale.",
    badge: "bg-red-100 text-red-800",
    bordure: "border-red-500",
    fond: "bg-red-50",
    icone: "×",
  };
}

export default function VerificationRecuPage() {
  const supabase = useMemo(() => createClient(), []);
  const [numeroRecu, setNumeroRecu] = useState("");
  const [codeVerification, setCodeVerification] =
    useState("");

  const [resultat, setResultat] =
    useState<RecuNumerique | null>(null);

  const [rechercheEffectuee, setRechercheEffectuee] =
    useState(false);

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const parametres = new URLSearchParams(
      window.location.search,
    );

    const numeroDansAdresse = parametres.get("numero") || "";
    const codeDansAdresse = parametres.get("code") || "";

    const numeroNettoye = normaliserValeur(numeroDansAdresse);
    const codeNettoye = normaliserValeur(codeDansAdresse);

    setNumeroRecu(numeroNettoye);
    setCodeVerification(codeNettoye);

    if (numeroNettoye && codeNettoye) {
      void rechercherRecu(
        numeroNettoye,
        codeNettoye,
        false,
      );
    } else {
      setChargement(false);
    }
  }, []);

  async function rechercherRecu(
    numero: string,
    code: string,
    modifierAdresse = true,
  ) {
    const numeroNettoye = normaliserValeur(numero);
    const codeNettoye = normaliserValeur(code);

    setNumeroRecu(numeroNettoye);
    setCodeVerification(codeNettoye);
    setErreur("");

    if (!numeroNettoye) {
      setResultat(null);
      setRechercheEffectuee(false);
      setChargement(false);
      setErreur("Veuillez saisir le numéro du reçu.");
      return;
    }

    if (!codeNettoye) {
      setResultat(null);
      setRechercheEffectuee(false);
      setChargement(false);
      setErreur("Veuillez saisir le code de vérification.");
      return;
    }

    setChargement(true);

    const { data, error } = await supabase.rpc(
      "verifier_recu_public",
      {
        numero_recherche: numeroNettoye,
        code_recherche: codeNettoye,
      },
    );

    if (error) {
      setResultat(null);
      setRechercheEffectuee(false);
      setErreur(
        "Le service de vérification des reçus est momentanément indisponible.",
      );
      setChargement(false);
      return;
    }

    setResultat((data as RecuNumerique | null) || null);
    setRechercheEffectuee(true);
    setChargement(false);

    if (modifierAdresse) {
      const nouvelleAdresse =
        `${window.location.pathname}?numero=` +
        `${encodeURIComponent(numeroNettoye)}` +
        `&code=${encodeURIComponent(codeNettoye)}`;

      window.history.replaceState({}, "", nouvelleAdresse);
    }
  }

  function soumettreRecherche(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    rechercherRecu(
      numeroRecu,
      codeVerification,
    );
  }

  function nouvelleRecherche() {
    setNumeroRecu("");
    setCodeVerification("");
    setResultat(null);
    setRechercheEffectuee(false);
    setErreur("");

    window.history.replaceState(
      {},
      "",
      window.location.pathname,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function modifierNumero(valeur: string) {
    setNumeroRecu(valeur.toUpperCase());
    setErreur("");
    setResultat(null);
    setRechercheEffectuee(false);
  }

  function modifierCode(valeur: string) {
    setCodeVerification(valeur.toUpperCase());
    setErreur("");
    setResultat(null);
    setRechercheEffectuee(false);
  }

  const styleStatut = resultat
    ? obtenirStyleStatut(resultat.statut)
    : null;

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      {/* Navigation */}
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
                Vérification des reçus
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/verification"
              className="hidden min-h-11 items-center justify-center rounded-xl border border-black/15 bg-white/30 px-4 text-sm font-extrabold text-black transition hover:bg-white/50 sm:inline-flex"
            >
              Vérifier un document
            </Link>

            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-4 text-sm font-extrabold text-white transition hover:bg-green-800"
            >
              ← Accueil
            </Link>
          </div>
        </div>
      </header>

      {/* Zone principale */}
      <section className="relative overflow-hidden bg-gradient-to-br from-black via-neutral-950 to-green-950">
        <div className="absolute -left-48 top-0 h-[450px] w-[450px] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -right-48 bottom-0 h-[500px] w-[500px] rounded-full bg-green-600/20 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-[1600px] gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">
              Vérification financière publique
            </p>

            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.08] tracking-[-0.04em] text-white md:text-5xl lg:text-6xl">
              Vérifiez un reçu provincial numérique
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-neutral-300 md:text-lg">
              Saisissez le numéro du reçu et son code de
              vérification pour confirmer son authenticité,
              son montant et son statut.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                  Numéro du reçu
                </p>

                <p className="mt-2 text-sm font-bold text-white">
                  PC-REC-2026-000001
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-wider text-green-400">
                  Code de vérification
                </p>

                <p className="mt-2 text-sm font-bold text-white">
                  VR-XXXXXXXX
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />

              <p className="text-sm leading-6 text-neutral-300">
                Le nom complet du payeur et ses informations
                personnelles sont protégés lors de la
                vérification publique.
              </p>
            </div>
          </div>

          {/* Formulaire de vérification */}
          <div className="rounded-[30px] bg-white p-6 shadow-2xl shadow-black/40 md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-green-700">
                  Recherche officielle
                </p>

                <h2 className="mt-3 text-2xl font-black tracking-tight text-black md:text-3xl">
                  Informations du reçu
                </h2>
              </div>

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black text-sm font-black text-white">
                REC
              </div>
            </div>

            <p className="mt-4 leading-7 text-neutral-600">
              Les deux informations doivent correspondre
              exactement au reçu délivré.
            </p>

            <form
              onSubmit={soumettreRecherche}
              className="mt-7 space-y-5"
            >
              <div>
                <label
                  htmlFor="numero-recu"
                  className="mb-2 block text-sm font-extrabold text-black"
                >
                  Numéro du reçu
                </label>

                <input
                  id="numero-recu"
                  type="text"
                  value={numeroRecu}
                  onChange={(event) =>
                    modifierNumero(event.target.value)
                  }
                  placeholder="PC-REC-2026-000001"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-h-14 w-full rounded-2xl border border-black/15 bg-neutral-50 px-5 font-extrabold uppercase tracking-wide text-black outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-neutral-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label
                  htmlFor="code-verification"
                  className="mb-2 block text-sm font-extrabold text-black"
                >
                  Code de vérification
                </label>

                <input
                  id="code-verification"
                  type="text"
                  value={codeVerification}
                  onChange={(event) =>
                    modifierCode(event.target.value)
                  }
                  placeholder="VR-XXXXXXXX"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-h-14 w-full rounded-2xl border border-black/15 bg-neutral-50 px-5 font-extrabold uppercase tracking-wide text-black outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-neutral-400 focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-100"
                />
              </div>

              {erreur && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800"
                >
                  {erreur}
                </div>
              )}

              <button
                type="submit"
                disabled={chargement}
                className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                {chargement
                  ? "Chargement du registre..."
                  : "Vérifier le reçu"}

                {!chargement && <span>→</span>}
              </button>
            </form>

            <p className="mt-5 text-center text-xs leading-5 text-neutral-400">
              La vérification ne modifie pas le reçu et ne
              communique aucune donnée privée supplémentaire.
            </p>
          </div>
        </div>
      </section>

      {/* Résultats */}
      <section className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        {!rechercheEffectuee && !chargement && (
          <div className="rounded-[28px] border border-dashed border-black/15 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 font-black text-neutral-500">
              REC
            </div>

            <h2 className="mt-5 text-2xl font-black text-black">
              Prêt pour la vérification
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-neutral-500">
              Entrez le numéro et le code inscrits sur le reçu
              numérique provincial.
            </p>
          </div>
        )}

        {rechercheEffectuee && !resultat && (
          <div className="rounded-[28px] border border-red-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-2xl font-black text-red-700">
                ×
              </div>

              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
                  Résultat de la vérification
                </p>

                <h2 className="mt-3 text-2xl font-black text-black md:text-3xl">
                  Reçu introuvable ou code incorrect
                </h2>

                <p className="mt-4 max-w-3xl leading-7 text-neutral-600">
                  Le numéro et le code saisis ne correspondent
                  à aucun reçu enregistré. Vérifiez tous les
                  caractères avant de recommencer.
                </p>

                <div className="mt-5 grid gap-3 rounded-2xl bg-neutral-100 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                      Numéro recherché
                    </p>

                    <p className="mt-2 break-all font-extrabold text-black">
                      {normaliserValeur(numeroRecu)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                      Code recherché
                    </p>

                    <p className="mt-2 break-all font-extrabold text-black">
                      {normaliserValeur(
                        codeVerification,
                      )}
                    </p>
                  </div>
                </div>

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

        {resultat && styleStatut && (
          <article className="overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-xl">
            <div
              className={`border-l-8 ${styleStatut.bordure} ${styleStatut.fond} p-6 md:p-8`}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black ${styleStatut.badge}`}
                  >
                    {styleStatut.icone}
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                      Résultat officiel
                    </p>

                    <h2 className="mt-3 text-2xl font-black tracking-tight text-black md:text-3xl">
                      {styleStatut.titre}
                    </h2>

                    <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
                      {styleStatut.description}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex self-start rounded-full px-5 py-2.5 text-sm font-black ${styleStatut.badge}`}
                >
                  {resultat.statut}
                </span>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="flex flex-col gap-5 border-b border-black/10 pb-7 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
                    Numéro du reçu
                  </p>

                  <p className="mt-2 break-all text-2xl font-black text-black md:text-3xl">
                    {resultat.numeroRecu}
                  </p>

                  <p className="mt-3 text-sm font-bold text-neutral-500">
                    Code : {resultat.codeVerification}
                  </p>
                </div>

                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-black text-center text-sm font-black text-white">
                  QR
                  <br />
                  REÇU
                </div>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-green-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-green-700">
                    Montant payé
                  </p>

                  <p className="mt-2 text-3xl font-black text-green-800">
                    {formaterMontant(
                      resultat.montantPaye,
                      resultat.devise,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-orange-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-orange-700">
                    Montant dû
                  </p>

                  <p className="mt-2 text-3xl font-black text-black">
                    {formaterMontant(
                      resultat.montantDu,
                      resultat.devise,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-100 p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-neutral-500">
                    Reste à payer
                  </p>

                  <p className="mt-2 text-3xl font-black text-black">
                    {formaterMontant(
                      resultat.resteAPayer,
                      resultat.devise,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <InformationPublique
                  label="Payeur protégé"
                  valeur={masquerNom(
                    resultat.payeurNom,
                  )}
                />

                <InformationPublique
                  label="Taxe ou frais"
                  valeur={resultat.taxeNom}
                />

                <InformationPublique
                  label="Catégorie"
                  valeur={resultat.taxeCategorie}
                />

                <InformationPublique
                  label="Activité concernée"
                  valeur={
                    resultat.activiteNom ||
                    "Aucune activité liée"
                  }
                />

                <InformationPublique
                  label="Date du paiement"
                  valeur={formaterDate(
                    resultat.datePaiement,
                  )}
                />

                <InformationPublique
                  label="Période concernée"
                  valeur={
                    resultat.periodeConcernee ||
                    "Non renseignée"
                  }
                />

                <InformationPublique
                  label="Mode de paiement"
                  valeur={resultat.modePaiement}
                />

                <InformationPublique
                  label="Bureau d’encaissement"
                  valeur={
                    resultat.bureauEncaissement
                  }
                />

                <InformationPublique
                  label="Numéro de paiement"
                  valeur={resultat.numeroPaiement}
                />
              </div>

              <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-neutral-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-extrabold text-black">
                    Vérification terminée
                  </p>

                  <p className="mt-1 text-sm leading-6 text-neutral-600">
                    Les informations affichées proviennent du
                    registre numérique enregistré dans Province
                    Connect.
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

      {/* Explications */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto grid w-full max-w-[1200px] gap-5 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
          <Etape
            numero="01"
            titre="Repérez le numéro"
            description="Le numéro commence généralement par PC-REC et se trouve en haut du reçu."
          />

          <Etape
            numero="02"
            titre="Saisissez le code"
            description="Le code de vérification commence par VR et confirme l’authenticité du reçu."
          />

          <Etape
            numero="03"
            titre="Contrôlez le statut"
            description="Vérifiez le montant, la taxe, la date et le statut administratif affichés."
          />
        </div>
      </section>

      {/* Pied de page */}
      <footer className="bg-black text-white">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col justify-between gap-6 px-4 py-9 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-xs font-black">
              PC
            </div>

            <div>
              <p className="font-black">
                Province Connect
              </p>

              <p className="mt-1 text-xs text-neutral-400">
                Registre Provincial Numérique
              </p>
            </div>
          </div>

          <p className="text-sm text-neutral-400">
            © 2026 Province Connect — Vérification
            publique des reçus.
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

      <p className="mt-2 break-words font-extrabold leading-6 text-black">
        {valeur}
      </p>
    </div>
  );
}

type EtapeProps = {
  numero: string;
  titre: string;
  description: string;
};

function Etape({
  numero,
  titre,
  description,
}: EtapeProps) {
  return (
    <article className="rounded-2xl border border-black/10 bg-neutral-50 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-xs font-black text-white">
        {numero}
      </div>

      <h3 className="mt-5 text-lg font-black text-black">
        {titre}
      </h3>

      <p className="mt-2 text-sm leading-6 text-neutral-600">
        {description}
      </p>
    </article>
  );
}