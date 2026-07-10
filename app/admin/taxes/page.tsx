"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSupabaseCollection } from "../../../lib/data/useSupabaseCollection";

type Devise = "CDF" | "USD";

type StatutTaxe =
  | "Actif"
  | "Suspendu"
  | "Brouillon"
  | "Archivé";

type TaxeProvinciale = {
  id: string;
  numero: string;
  nom: string;
  categorie: string;
  cible: string;
  montant: number;
  devise: Devise;
  frequence: string;
  commune: string;
  dateDebut: string;
  dateFin: string;
  description: string;
  statut: StatutTaxe;
  createdAt: string;
  updatedAt: string;
};

type FormulaireTaxe = {
  nom: string;
  categorie: string;
  cible: string;
  montant: string;
  devise: Devise;
  frequence: string;
  commune: string;
  dateDebut: string;
  dateFin: string;
  description: string;
  statut: StatutTaxe;
};

const CLE_TAXES = "province-connect-taxes";

const categoriesTaxes = [
  "Carte commerçant",
  "Carte artiste",
  "Carte enseignant",
  "Carte pasteur",
  "Carte transporteur",
  "Permis de conduire provincial",
  "Carte agent administratif",
  "Carte de structure sociale",
  "Autorisation d’activité",
  "Enregistrement d’une activité",
  "Renouvellement de document",
  "Transport",
  "Commerce",
  "Culture et arts",
  "Éducation",
  "Santé",
  "Structure sociale",
  "Autre",
];

const ciblesTaxes = [
  "Personne",
  "Activité",
  "Carte provinciale",
  "Permis provincial",
  "Entreprise",
  "Association",
  "Structure sociale",
  "Transporteur",
  "Commerçant",
  "Autre",
];

const frequences = [
  "Paiement unique",
  "Mensuelle",
  "Trimestrielle",
  "Semestrielle",
  "Annuelle",
  "À chaque renouvellement",
];

const communes = [
  "Toutes les communes",
  "Ibanda",
  "Kadutu",
  "Bagira",
  "Commune rurale",
  "Autre commune",
];

const statuts: StatutTaxe[] = [
  "Brouillon",
  "Actif",
  "Suspendu",
  "Archivé",
];

function obtenirDateAujourdhui() {
  const date = new Date();
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");

  return `${annee}-${mois}-${jour}`;
}

function creerFormulaireInitial(): FormulaireTaxe {
  return {
    nom: "",
    categorie: "Carte commerçant",
    cible: "Personne",
    montant: "",
    devise: "CDF",
    frequence: "Paiement unique",
    commune: "Toutes les communes",
    dateDebut: obtenirDateAujourdhui(),
    dateFin: "",
    description: "",
    statut: "Brouillon",
  };
}

function formaterDate(date: string) {
  if (!date) {
    return "Non définie";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formaterMontant(montant: number, devise: Devise) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: devise === "CDF" ? 0 : 2,
  }).format(montant)} ${devise}`;
}

export default function AdminTaxesPage() {
  const [taxes, setTaxes] = useState<TaxeProvinciale[]>([]);

  const [formulaire, setFormulaire] =
    useState<FormulaireTaxe>(creerFormulaireInitial);

  const [formulaireVisible, setFormulaireVisible] =
    useState(false);

  const [taxeEnModification, setTaxeEnModification] = useState<
    string | null
  >(null);

  const [taxeConsultee, setTaxeConsultee] =
    useState<TaxeProvinciale | null>(null);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [filtreDevise, setFiltreDevise] = useState("Toutes");
  const [filtreCategorie, setFiltreCategorie] =
    useState("Toutes");

  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  useSupabaseCollection({
    table: "taxes",
    items: taxes,
    setItems: setTaxes,
    localStorageKey: CLE_TAXES,
    onError: setErreur,
  });

  const statistiques = useMemo(() => {
    return {
      total: taxes.length,

      actives: taxes.filter(
        (taxe) => taxe.statut === "Actif",
      ).length,

      cdf: taxes.filter(
        (taxe) =>
          taxe.devise === "CDF" &&
          taxe.statut !== "Archivé",
      ).length,

      usd: taxes.filter(
        (taxe) =>
          taxe.devise === "USD" &&
          taxe.statut !== "Archivé",
      ).length,
    };
  }, [taxes]);

  const taxesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return taxes.filter((taxe) => {
      const correspondRecherche =
        !terme ||
        taxe.nom.toLowerCase().includes(terme) ||
        taxe.numero.toLowerCase().includes(terme) ||
        taxe.categorie.toLowerCase().includes(terme) ||
        taxe.cible.toLowerCase().includes(terme) ||
        taxe.commune.toLowerCase().includes(terme);

      const correspondStatut =
        filtreStatut === "Tous" ||
        taxe.statut === filtreStatut;

      const correspondDevise =
        filtreDevise === "Toutes" ||
        taxe.devise === filtreDevise;

      const correspondCategorie =
        filtreCategorie === "Toutes" ||
        taxe.categorie === filtreCategorie;

      return (
        correspondRecherche &&
        correspondStatut &&
        correspondDevise &&
        correspondCategorie
      );
    });
  }, [
    taxes,
    recherche,
    filtreStatut,
    filtreDevise,
    filtreCategorie,
  ]);

  function modifierChamp<K extends keyof FormulaireTaxe>(
    champ: K,
    valeur: FormulaireTaxe[K],
  ) {
    setFormulaire((ancienFormulaire) => ({
      ...ancienFormulaire,
      [champ]: valeur,
    }));

    setErreur("");
    setMessage("");
  }

  function genererNumeroTaxe() {
    const annee = new Date().getFullYear();

    const plusGrandNumero = taxes.reduce(
      (maximum, taxe) => {
        const dernierePartie = taxe.numero.split("-").pop();
        const numero = Number(dernierePartie);

        return Number.isFinite(numero)
          ? Math.max(maximum, numero)
          : maximum;
      },
      0,
    );

    return `PC-TAX-${annee}-${String(
      plusGrandNumero + 1,
    ).padStart(6, "0")}`;
  }

  function verifierFormulaire() {
    if (!formulaire.nom.trim()) {
      return "Le nom de la taxe est obligatoire.";
    }

    const montant = Number(formulaire.montant);

    if (
      !formulaire.montant.trim() ||
      !Number.isFinite(montant) ||
      montant <= 0
    ) {
      return "Veuillez saisir un montant supérieur à zéro.";
    }

    if (!formulaire.dateDebut) {
      return "La date de début d’application est obligatoire.";
    }

    if (
      formulaire.dateFin &&
      formulaire.dateFin < formulaire.dateDebut
    ) {
      return "La date de fin ne peut pas être antérieure à la date de début.";
    }

    const taxeExiste = taxes.some(
      (taxe) =>
        taxe.nom.trim().toLowerCase() ===
          formulaire.nom.trim().toLowerCase() &&
        taxe.categorie === formulaire.categorie &&
        taxe.commune === formulaire.commune &&
        taxe.id !== taxeEnModification &&
        taxe.statut !== "Archivé",
    );

    if (taxeExiste) {
      return "Une taxe similaire existe déjà pour cette catégorie et cette commune.";
    }

    return "";
  }

  function enregistrerTaxe(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErreur("");
    setMessage("");

    const erreurValidation = verifierFormulaire();

    if (erreurValidation) {
      setErreur(erreurValidation);
      return;
    }

    const maintenant = new Date().toISOString();
    const montant = Number(formulaire.montant);

    if (taxeEnModification) {
      setTaxes((anciennesTaxes) =>
        anciennesTaxes.map((taxe) =>
          taxe.id === taxeEnModification
            ? {
                ...taxe,
                nom: formulaire.nom.trim(),
                categorie: formulaire.categorie,
                cible: formulaire.cible,
                montant,
                devise: formulaire.devise,
                frequence: formulaire.frequence,
                commune: formulaire.commune,
                dateDebut: formulaire.dateDebut,
                dateFin: formulaire.dateFin,
                description:
                  formulaire.description.trim(),
                statut: formulaire.statut,
                updatedAt: maintenant,
              }
            : taxe,
        ),
      );

      setMessage(
        "La taxe a été modifiée avec succès.",
      );
    } else {
      const nouvelleTaxe: TaxeProvinciale = {
        id: crypto.randomUUID(),
        numero: genererNumeroTaxe(),
        nom: formulaire.nom.trim(),
        categorie: formulaire.categorie,
        cible: formulaire.cible,
        montant,
        devise: formulaire.devise,
        frequence: formulaire.frequence,
        commune: formulaire.commune,
        dateDebut: formulaire.dateDebut,
        dateFin: formulaire.dateFin,
        description: formulaire.description.trim(),
        statut: formulaire.statut,
        createdAt: maintenant,
        updatedAt: maintenant,
      };

      setTaxes((anciennesTaxes) => [
        nouvelleTaxe,
        ...anciennesTaxes,
      ]);

      setMessage(
        `La taxe ${nouvelleTaxe.numero} a été créée avec succès.`,
      );
    }

    fermerFormulaire(false);
  }

  function ouvrirNouveauFormulaire() {
    setFormulaire(creerFormulaireInitial());
    setTaxeEnModification(null);
    setTaxeConsultee(null);
    setFormulaireVisible(true);
    setErreur("");
    setMessage("");
  }

  function fermerFormulaire(effacerMessage = true) {
    setFormulaire(creerFormulaireInitial());
    setTaxeEnModification(null);
    setFormulaireVisible(false);
    setErreur("");

    if (effacerMessage) {
      setMessage("");
    }
  }

  function modifierTaxe(taxe: TaxeProvinciale) {
    setFormulaire({
      nom: taxe.nom,
      categorie: taxe.categorie,
      cible: taxe.cible,
      montant: String(taxe.montant),
      devise: taxe.devise,
      frequence: taxe.frequence,
      commune: taxe.commune,
      dateDebut: taxe.dateDebut,
      dateFin: taxe.dateFin,
      description: taxe.description,
      statut: taxe.statut,
    });

    setTaxeEnModification(taxe.id);
    setTaxeConsultee(null);
    setFormulaireVisible(true);
    setErreur("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function changerStatut(
    id: string,
    nouveauStatut: StatutTaxe,
  ) {
    const maintenant = new Date().toISOString();

    setTaxes((anciennesTaxes) =>
      anciennesTaxes.map((taxe) =>
        taxe.id === id
          ? {
              ...taxe,
              statut: nouveauStatut,
              updatedAt: maintenant,
            }
          : taxe,
      ),
    );

    setTaxeConsultee((ancienneTaxe) =>
      ancienneTaxe?.id === id
        ? {
            ...ancienneTaxe,
            statut: nouveauStatut,
            updatedAt: maintenant,
          }
        : ancienneTaxe,
    );

    setMessage(
      `Le statut de la taxe est maintenant « ${nouveauStatut} ».`,
    );
  }

  function archiverTaxe(taxe: TaxeProvinciale) {
    const confirmation = window.confirm(
      `Voulez-vous archiver la taxe « ${taxe.nom} » ?`,
    );

    if (!confirmation) {
      return;
    }

    changerStatut(taxe.id, "Archivé");
  }

  function obtenirStyleStatut(statut: StatutTaxe) {
    if (statut === "Actif") {
      return "bg-green-100 text-green-800";
    }

    if (statut === "Brouillon") {
      return "bg-orange-100 text-orange-800";
    }

    if (statut === "Suspendu") {
      return "bg-red-100 text-red-800";
    }

    return "bg-neutral-200 text-neutral-700";
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      {/* En-tête */}
      <header className="sticky top-0 z-40 border-b border-orange-600 bg-orange-500 shadow-md">
        <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-xs font-black text-white"
            >
              PC
            </Link>

            <div>
              <p className="font-black text-black">
                Province Connect
              </p>

              <p className="text-xs font-semibold text-black/65">
                Taxes provinciales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin/cartes"
              className="hidden rounded-xl border border-black/15 bg-white/30 px-4 py-2.5 text-sm font-extrabold text-black transition hover:bg-white/50 sm:inline-flex"
            >
              Cartes
            </Link>

            <Link
              href="/admin/activites"
              className="hidden rounded-xl border border-black/15 bg-white/30 px-4 py-2.5 text-sm font-extrabold text-black transition hover:bg-white/50 md:inline-flex"
            >
              Activités
            </Link>

            <Link
              href="/admin/dashboard"
              className="rounded-xl bg-black px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-green-800"
            >
              Tableau de bord
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8">
        {/* Titre */}
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
              Administration financière
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-black md:text-4xl">
              Taxes provinciales
            </h1>

            <p className="mt-3 max-w-3xl leading-7 text-neutral-600">
              Définissez les frais applicables aux personnes,
              activités, cartes, permis et autorisations
              provinciales.
            </p>
          </div>

          <button
            type="button"
            onClick={
              formulaireVisible
                ? () => fermerFormulaire()
                : ouvrirNouveauFormulaire
            }
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-6 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
          >
            {formulaireVisible
              ? "Fermer le formulaire"
              : "+ Nouvelle taxe"}
          </button>
        </section>

        {/* Messages */}
        {message && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
            {message}
          </div>
        )}

        {erreur && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            {erreur}
          </div>
        )}

        {/* Statistiques */}
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              titre: "Total des taxes",
              valeur: statistiques.total,
              couleur: "text-black",
            },
            {
              titre: "Taxes actives",
              valeur: statistiques.actives,
              couleur: "text-green-700",
            },
            {
              titre: "Taxes en CDF",
              valeur: statistiques.cdf,
              couleur: "text-orange-600",
            },
            {
              titre: "Taxes en USD",
              valeur: statistiques.usd,
              couleur: "text-blue-700",
            },
          ].map((statistique) => (
            <article
              key={statistique.titre}
              className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-bold text-neutral-500">
                {statistique.titre}
              </p>

              <p
                className={`mt-3 text-3xl font-black ${statistique.couleur}`}
              >
                {statistique.valeur}
              </p>
            </article>
          ))}
        </section>

        {/* Formulaire */}
        {formulaireVisible && (
          <section className="mt-7 overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/10 bg-black px-6 py-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                Configuration financière
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {taxeEnModification
                  ? "Modifier une taxe"
                  : "Nouvelle taxe provinciale"}
              </h2>
            </div>

            <form
              onSubmit={enregistrerTaxe}
              className="grid gap-7 p-6 xl:grid-cols-[1fr_380px]"
            >
              <div className="space-y-5">
                <ChampTexte
                  id="nom-taxe"
                  label="Nom de la taxe ou du frais"
                  value={formulaire.nom}
                  placeholder="Exemple : Frais annuel de carte commerçant"
                  onChange={(valeur) =>
                    modifierChamp("nom", valeur)
                  }
                />

                <div className="grid gap-5 md:grid-cols-3">
                  <ChampSelection
                    id="categorie-taxe"
                    label="Catégorie concernée"
                    value={formulaire.categorie}
                    options={categoriesTaxes}
                    onChange={(valeur) =>
                      modifierChamp("categorie", valeur)
                    }
                  />

                  <ChampSelection
                    id="cible-taxe"
                    label="Cible du paiement"
                    value={formulaire.cible}
                    options={ciblesTaxes}
                    onChange={(valeur) =>
                      modifierChamp("cible", valeur)
                    }
                  />

                  <ChampSelection
                    id="frequence-taxe"
                    label="Fréquence"
                    value={formulaire.frequence}
                    options={frequences}
                    onChange={(valeur) =>
                      modifierChamp("frequence", valeur)
                    }
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label
                      htmlFor="montant-taxe"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Montant
                    </label>

                    <input
                      id="montant-taxe"
                      type="number"
                      min="0"
                      step={
                        formulaire.devise === "CDF"
                          ? "1"
                          : "0.01"
                      }
                      value={formulaire.montant}
                      onChange={(event) =>
                        modifierChamp(
                          "montant",
                          event.target.value,
                        )
                      }
                      placeholder="Exemple : 10000"
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="devise-taxe"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Devise
                    </label>

                    <select
                      id="devise-taxe"
                      value={formulaire.devise}
                      onChange={(event) =>
                        modifierChamp(
                          "devise",
                          event.target.value as Devise,
                        )
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="CDF">
                        Franc congolais — CDF
                      </option>

                      <option value="USD">
                        Dollar américain — USD
                      </option>
                    </select>
                  </div>

                  <ChampSelection
                    id="statut-taxe"
                    label="Statut"
                    value={formulaire.statut}
                    options={statuts}
                    onChange={(valeur) =>
                      modifierChamp(
                        "statut",
                        valeur as StatutTaxe,
                      )
                    }
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <ChampSelection
                    id="commune-taxe"
                    label="Commune concernée"
                    value={formulaire.commune}
                    options={communes}
                    onChange={(valeur) =>
                      modifierChamp("commune", valeur)
                    }
                  />

                  <div>
                    <label
                      htmlFor="date-debut"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Début d’application
                    </label>

                    <input
                      id="date-debut"
                      type="date"
                      value={formulaire.dateDebut}
                      onChange={(event) =>
                        modifierChamp(
                          "dateDebut",
                          event.target.value,
                        )
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="date-fin"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Fin d’application
                    </label>

                    <input
                      id="date-fin"
                      type="date"
                      value={formulaire.dateFin}
                      onChange={(event) =>
                        modifierChamp(
                          "dateFin",
                          event.target.value,
                        )
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />

                    <p className="mt-2 text-xs text-neutral-500">
                      Laissez vide si la taxe n’a pas de date de fin.
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="description-taxe"
                    className="mb-2 block text-sm font-extrabold text-black"
                  >
                    Description et conditions
                  </label>

                  <textarea
                    id="description-taxe"
                    value={formulaire.description}
                    onChange={(event) =>
                      modifierChamp(
                        "description",
                        event.target.value,
                      )
                    }
                    placeholder="Expliquez l’objet de la taxe, les personnes concernées et les conditions d’application..."
                    className="min-h-32 w-full resize-y rounded-xl border border-black/15 bg-neutral-50 px-4 py-3 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-black/10 pt-6 sm:flex-row">
                  <button
                    type="submit"
                    className="min-h-14 rounded-xl bg-orange-500 px-7 font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                  >
                    {taxeEnModification
                      ? "Enregistrer les modifications"
                      : "Créer la taxe"}
                  </button>

                  <button
                    type="button"
                    onClick={() => fermerFormulaire()}
                    className="min-h-14 rounded-xl border border-black/15 bg-white px-7 font-extrabold text-black transition hover:bg-neutral-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>

              {/* Aperçu */}
              <aside>
                <p className="mb-2 text-sm font-extrabold text-black">
                  Résumé de la taxe
                </p>

                <div className="overflow-hidden rounded-[26px] border-4 border-black bg-white shadow-xl">
                  <div className="bg-orange-500 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-xs font-black text-white">
                        PC
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${obtenirStyleStatut(
                          formulaire.statut,
                        )}`}
                      >
                        {formulaire.statut}
                      </span>
                    </div>

                    <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-black/60">
                      Taxe provinciale
                    </p>

                    <h3 className="mt-2 text-xl font-black leading-tight text-black">
                      {formulaire.nom ||
                        "Nom de la taxe"}
                    </h3>
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                      Montant
                    </p>

                    <p className="mt-2 text-3xl font-black text-green-700">
                      {formulaire.montant
                        ? formaterMontant(
                            Number(formulaire.montant),
                            formulaire.devise,
                          )
                        : `0 ${formulaire.devise}`}
                    </p>

                    <div className="mt-6 space-y-4">
                      <Resume
                        label="Catégorie"
                        valeur={formulaire.categorie}
                      />

                      <Resume
                        label="Cible"
                        valeur={formulaire.cible}
                      />

                      <Resume
                        label="Fréquence"
                        valeur={formulaire.frequence}
                      />

                      <Resume
                        label="Commune"
                        valeur={formulaire.commune}
                      />

                      <Resume
                        label="Début d’application"
                        valeur={formaterDate(
                          formulaire.dateDebut,
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm font-extrabold text-orange-900">
                    Important
                  </p>

                  <p className="mt-2 text-sm leading-6 text-orange-800">
                    Seules les taxes avec le statut « Actif »
                    seront proposées dans le prochain module de
                    paiement.
                  </p>
                </div>
              </aside>
            </form>
          </section>
        )}

        {/* Recherche et filtres */}
        <section className="mt-7 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_260px_190px_190px]">
            <input
              type="search"
              value={recherche}
              onChange={(event) =>
                setRecherche(event.target.value)
              }
              placeholder="Rechercher par nom, numéro, cible ou commune..."
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />

            <select
              value={filtreCategorie}
              onChange={(event) =>
                setFiltreCategorie(event.target.value)
              }
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="Toutes">
                Toutes les catégories
              </option>

              {categoriesTaxes.map((categorie) => (
                <option
                  key={categorie}
                  value={categorie}
                >
                  {categorie}
                </option>
              ))}
            </select>

            <select
              value={filtreDevise}
              onChange={(event) =>
                setFiltreDevise(event.target.value)
              }
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="Toutes">
                Toutes les devises
              </option>
              <option value="CDF">CDF</option>
              <option value="USD">USD</option>
            </select>

            <select
              value={filtreStatut}
              onChange={(event) =>
                setFiltreStatut(event.target.value)
              }
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="Tous">
                Tous les statuts
              </option>

              {statuts.map((statut) => (
                <option key={statut} value={statut}>
                  {statut}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Liste */}
        <section className="mt-7">
          {taxesFiltrees.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 font-black text-neutral-500">
                TAX
              </div>

              <h2 className="mt-5 text-xl font-black text-black">
                Aucune taxe enregistrée
              </h2>

              <p className="mx-auto mt-3 max-w-lg leading-7 text-neutral-500">
                Utilisez le bouton « Nouvelle taxe » pour
                enregistrer le premier tarif provincial.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] border-collapse text-left">
                  <thead className="bg-neutral-50">
                    <tr className="text-xs uppercase tracking-wider text-neutral-500">
                      <th className="px-5 py-4 font-black">
                        Taxe
                      </th>
                      <th className="px-5 py-4 font-black">
                        Numéro
                      </th>
                      <th className="px-5 py-4 font-black">
                        Catégorie
                      </th>
                      <th className="px-5 py-4 font-black">
                        Montant
                      </th>
                      <th className="px-5 py-4 font-black">
                        Fréquence
                      </th>
                      <th className="px-5 py-4 font-black">
                        Commune
                      </th>
                      <th className="px-5 py-4 font-black">
                        Statut
                      </th>
                      <th className="px-5 py-4 font-black">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {taxesFiltrees.map((taxe) => (
                      <tr
                        key={taxe.id}
                        className="border-t border-black/5 transition hover:bg-orange-50/40"
                      >
                        <td className="px-5 py-4">
                          <p className="font-extrabold text-black">
                            {taxe.nom}
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            Cible : {taxe.cible}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-extrabold text-black">
                          {taxe.numero}
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600">
                          {taxe.categorie}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-black text-green-700">
                            {formaterMontant(
                              taxe.montant,
                              taxe.devise,
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600">
                          {taxe.frequence}
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600">
                          {taxe.commune}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold ${obtenirStyleStatut(
                              taxe.statut,
                            )}`}
                          >
                            {taxe.statut}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setTaxeConsultee(taxe)
                              }
                              className="rounded-lg bg-black px-3 py-2 text-xs font-extrabold text-white transition hover:bg-green-800"
                            >
                              Consulter
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                modifierTaxe(taxe)
                              }
                              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-700 transition hover:bg-orange-100"
                            >
                              Modifier
                            </button>

                            {taxe.statut !== "Archivé" && (
                              <button
                                type="button"
                                onClick={() =>
                                  archiverTaxe(taxe)
                                }
                                className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs font-extrabold text-neutral-700 transition hover:bg-neutral-200"
                              >
                                Archiver
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Fenêtre de consultation */}
      {taxeConsultee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="my-8 w-full max-w-4xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-5 bg-black px-6 py-5 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                  Configuration de la taxe
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {taxeConsultee.nom}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setTaxeConsultee(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl transition hover:bg-white/20"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="rounded-2xl bg-orange-50 p-5">
                <p className="text-xs font-black uppercase tracking-wider text-orange-700">
                  Montant applicable
                </p>

                <p className="mt-2 text-4xl font-black text-black">
                  {formaterMontant(
                    taxeConsultee.montant,
                    taxeConsultee.devise,
                  )}
                </p>
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Information
                  label="Numéro"
                  valeur={taxeConsultee.numero}
                />

                <Information
                  label="Catégorie"
                  valeur={taxeConsultee.categorie}
                />

                <Information
                  label="Cible"
                  valeur={taxeConsultee.cible}
                />

                <Information
                  label="Fréquence"
                  valeur={taxeConsultee.frequence}
                />

                <Information
                  label="Commune"
                  valeur={taxeConsultee.commune}
                />

                <Information
                  label="Statut"
                  valeur={taxeConsultee.statut}
                />

                <Information
                  label="Début d’application"
                  valeur={formaterDate(
                    taxeConsultee.dateDebut,
                  )}
                />

                <Information
                  label="Fin d’application"
                  valeur={formaterDate(
                    taxeConsultee.dateFin,
                  )}
                />

                <Information
                  label="Devise"
                  valeur={taxeConsultee.devise}
                />
              </div>

              <div className="mt-7 border-t border-black/10 pt-6">
                <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                  Description
                </p>

                <p className="mt-3 leading-7 text-neutral-700">
                  {taxeConsultee.description ||
                    "Aucune description ajoutée."}
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    modifierTaxe(taxeConsultee)
                  }
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-orange-600"
                >
                  Modifier la taxe
                </button>

                {taxeConsultee.statut === "Brouillon" && (
                  <button
                    type="button"
                    onClick={() =>
                      changerStatut(
                        taxeConsultee.id,
                        "Actif",
                      )
                    }
                    className="rounded-xl bg-green-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-green-800"
                  >
                    Activer la taxe
                  </button>
                )}

                {taxeConsultee.statut === "Actif" && (
                  <button
                    type="button"
                    onClick={() =>
                      changerStatut(
                        taxeConsultee.id,
                        "Suspendu",
                      )
                    }
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-red-700"
                  >
                    Suspendre
                  </button>
                )}

                {taxeConsultee.statut === "Suspendu" && (
                  <button
                    type="button"
                    onClick={() =>
                      changerStatut(
                        taxeConsultee.id,
                        "Actif",
                      )
                    }
                    className="rounded-xl bg-green-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-green-800"
                  >
                    Réactiver
                  </button>
                )}

                {taxeConsultee.statut !== "Archivé" && (
                  <button
                    type="button"
                    onClick={() =>
                      archiverTaxe(taxeConsultee)
                    }
                    className="rounded-xl border border-neutral-200 bg-neutral-100 px-5 py-3 text-sm font-extrabold text-neutral-700 transition hover:bg-neutral-200"
                  >
                    Archiver
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

type ChampTexteProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (valeur: string) => void;
};

function ChampTexte({
  id,
  label,
  value,
  placeholder,
  onChange,
}: ChampTexteProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-extrabold text-black"
      >
        {label}
      </label>

      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
      />
    </div>
  );
}

type ChampSelectionProps = {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (valeur: string) => void;
};

function ChampSelection({
  id,
  label,
  value,
  options,
  onChange,
}: ChampSelectionProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-extrabold text-black"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

type InformationProps = {
  label: string;
  valeur: string;
};

function Information({ label, valeur }: InformationProps) {
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

type ResumeProps = {
  label: string;
  valeur: string;
};

function Resume({ label, valeur }: ResumeProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/5 pb-3">
      <span className="text-sm font-bold text-neutral-500">
        {label}
      </span>

      <span className="max-w-[190px] text-right text-sm font-extrabold text-black">
        {valeur}
      </span>
    </div>
  );
}



