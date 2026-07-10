"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSupabaseCollection } from "../../../lib/data/useSupabaseCollection";

type StatutActivite =
  | "En attente"
  | "Autorisé"
  | "À renouveler"
  | "Expiré"
  | "Suspendu"
  | "Fermé"
  | "Refusé";

type Personne = {
  id: string;
  numero: string;
  nomComplet: string;
  telephone: string;
  commune: string;
  statut: string;
};

type Activite = {
  id: string;
  numero: string;
  nomActivite: string;
  typeActivite: string;
  secteur: string;
  responsableId: string;
  responsableNom: string;
  telephone: string;
  commune: string;
  quartier: string;
  avenue: string;
  adresse: string;
  dateOuverture: string;
  image: string;
  statut: StatutActivite;
  createdAt: string;
  updatedAt: string;
};

type FormulaireActivite = {
  nomActivite: string;
  typeActivite: string;
  secteur: string;
  responsableId: string;
  telephone: string;
  commune: string;
  quartier: string;
  avenue: string;
  adresse: string;
  dateOuverture: string;
  image: string;
  statut: StatutActivite;
};

const CLE_ACTIVITES = "province-connect-activites";
const CLE_PERSONNES = "province-connect-personnes";

const formulaireInitial: FormulaireActivite = {
  nomActivite: "",
  typeActivite: "Boutique",
  secteur: "Commerce",
  responsableId: "",
  telephone: "",
  commune: "",
  quartier: "",
  avenue: "",
  adresse: "",
  dateOuverture: "",
  image: "",
  statut: "En attente",
};

const typesActivites = [
  "Boutique",
  "Bureau",
  "Entreprise",
  "Commerce",
  "Atelier",
  "Studio",
  "École",
  "Centre de formation",
  "Structure culturelle",
  "Structure sociale",
  "Association",
  "Église",
  "Transport",
  "Restaurant",
  "Hôtel",
  "Pharmacie",
  "Clinique",
  "Dépôt",
  "Autre",
];

const secteurs = [
  "Commerce",
  "Transport",
  "Éducation",
  "Santé",
  "Culture et arts",
  "Communication",
  "Agriculture",
  "Élevage",
  "Construction",
  "Hôtellerie",
  "Restauration",
  "Services",
  "Administration",
  "Religion",
  "Secteur social",
  "Industrie",
  "Autre",
];

const communes = [
  "Ibanda",
  "Kadutu",
  "Bagira",
  "Commune rurale",
  "Autre commune",
];

const statuts: StatutActivite[] = [
  "En attente",
  "Autorisé",
  "À renouveler",
  "Expiré",
  "Suspendu",
  "Fermé",
  "Refusé",
];

export default function AdminActivitesPage() {
  const [activites, setActivites] = useState<Activite[]>([]);
  const [personnes, setPersonnes] = useState<Personne[]>([]);

  const [formulaire, setFormulaire] =
    useState<FormulaireActivite>(formulaireInitial);

  const [formulaireVisible, setFormulaireVisible] = useState(false);
  const [activiteEnModification, setActiviteEnModification] = useState<
    string | null
  >(null);

  const [activiteConsultee, setActiviteConsultee] =
    useState<Activite | null>(null);

  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("Tous");
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [filtreCommune, setFiltreCommune] = useState("Toutes");

  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  useSupabaseCollection({
    table: "personnes",
    items: personnes,
    setItems: setPersonnes,
    readOnly: true,
    normaliser: (donnees) =>
      [...donnees]
        .filter((personne) => personne.statut !== "Archivé")
        .sort((a, b) =>
          a.nomComplet.localeCompare(b.nomComplet, "fr"),
        ),
    onError: setErreur,
  });

  useSupabaseCollection({
    table: "activites",
    items: activites,
    setItems: setActivites,
    localStorageKey: CLE_ACTIVITES,
    onError: setErreur,
  });

  const statistiques = useMemo(() => {
    return {
      total: activites.length,
      autorisees: activites.filter(
        (activite) => activite.statut === "Autorisé",
      ).length,
      attente: activites.filter(
        (activite) => activite.statut === "En attente",
      ).length,
      suspendues: activites.filter(
        (activite) => activite.statut === "Suspendu",
      ).length,
    };
  }, [activites]);

  const activitesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return activites.filter((activite) => {
      const correspondRecherche =
        !terme ||
        activite.nomActivite.toLowerCase().includes(terme) ||
        activite.numero.toLowerCase().includes(terme) ||
        activite.responsableNom.toLowerCase().includes(terme) ||
        activite.telephone.toLowerCase().includes(terme) ||
        activite.quartier.toLowerCase().includes(terme);

      const correspondType =
        filtreType === "Tous" ||
        activite.typeActivite === filtreType;

      const correspondStatut =
        filtreStatut === "Tous" ||
        activite.statut === filtreStatut;

      const correspondCommune =
        filtreCommune === "Toutes" ||
        activite.commune === filtreCommune;

      return (
        correspondRecherche &&
        correspondType &&
        correspondStatut &&
        correspondCommune
      );
    });
  }, [
    activites,
    recherche,
    filtreType,
    filtreStatut,
    filtreCommune,
  ]);

  function modifierChamp<K extends keyof FormulaireActivite>(
    champ: K,
    valeur: FormulaireActivite[K],
  ) {
    setFormulaire((ancienFormulaire) => ({
      ...ancienFormulaire,
      [champ]: valeur,
    }));

    setErreur("");
    setMessage("");
  }

  function choisirResponsable(responsableId: string) {
    const personne = personnes.find(
      (element) => element.id === responsableId,
    );

    setFormulaire((ancienFormulaire) => ({
      ...ancienFormulaire,
      responsableId,
      telephone:
        ancienFormulaire.telephone || personne?.telephone || "",
      commune:
        ancienFormulaire.commune || personne?.commune || "",
    }));

    setErreur("");
    setMessage("");
  }

  function importerImage(event: ChangeEvent<HTMLInputElement>) {
    const fichier = event.target.files?.[0];

    if (!fichier) {
      return;
    }

    if (!fichier.type.startsWith("image/")) {
      setErreur("Veuillez sélectionner une image valide.");
      return;
    }

    const tailleMaximale = 2 * 1024 * 1024;

    if (fichier.size > tailleMaximale) {
      setErreur("L’image ne doit pas dépasser 2 Mo.");
      return;
    }

    const lecteur = new FileReader();

    lecteur.onload = () => {
      if (typeof lecteur.result === "string") {
        modifierChamp("image", lecteur.result);
      }
    };

    lecteur.onerror = () => {
      setErreur("Impossible de lire l’image sélectionnée.");
    };

    lecteur.readAsDataURL(fichier);
  }

  function genererNumeroActivite() {
    const annee = new Date().getFullYear();

    const plusGrandNumero = activites.reduce(
      (valeurMaximale, activite) => {
        const dernierePartie = activite.numero.split("-").pop();
        const nombre = Number(dernierePartie);

        return Number.isFinite(nombre)
          ? Math.max(valeurMaximale, nombre)
          : valeurMaximale;
      },
      0,
    );

    return `PC-ACT-${annee}-${String(
      plusGrandNumero + 1,
    ).padStart(6, "0")}`;
  }

  function verifierFormulaire() {
    if (!formulaire.nomActivite.trim()) {
      return "Le nom de l’activité est obligatoire.";
    }

    if (!formulaire.responsableId) {
      return "Veuillez sélectionner le responsable de l’activité.";
    }

    if (!formulaire.telephone.trim()) {
      return "Le numéro de téléphone de l’activité est obligatoire.";
    }

    if (!formulaire.commune) {
      return "Veuillez sélectionner une commune.";
    }

    if (!formulaire.quartier.trim()) {
      return "Le quartier est obligatoire.";
    }

    const activiteExiste = activites.some(
      (activite) =>
        activite.nomActivite.trim().toLowerCase() ===
          formulaire.nomActivite.trim().toLowerCase() &&
        activite.commune === formulaire.commune &&
        activite.id !== activiteEnModification,
    );

    if (activiteExiste) {
      return "Une activité portant ce nom existe déjà dans cette commune.";
    }

    return "";
  }

  function enregistrerActivite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErreur("");
    setMessage("");

    const erreurValidation = verifierFormulaire();

    if (erreurValidation) {
      setErreur(erreurValidation);
      return;
    }

    const responsable = personnes.find(
      (personne) => personne.id === formulaire.responsableId,
    );

    if (!responsable) {
      setErreur("Le responsable sélectionné est introuvable.");
      return;
    }

    if (activiteEnModification) {
      setActivites((anciennesActivites) =>
        anciennesActivites.map((activite) =>
          activite.id === activiteEnModification
            ? {
                ...activite,
                ...formulaire,
                nomActivite: formulaire.nomActivite.trim(),
                responsableNom: responsable.nomComplet,
                telephone: formulaire.telephone.trim(),
                quartier: formulaire.quartier.trim(),
                avenue: formulaire.avenue.trim(),
                adresse: formulaire.adresse.trim(),
                updatedAt: new Date().toISOString(),
              }
            : activite,
        ),
      );

      setMessage("L’activité a été modifiée avec succès.");
    } else {
      const nouvelleActivite: Activite = {
        id: crypto.randomUUID(),
        numero: genererNumeroActivite(),
        ...formulaire,
        nomActivite: formulaire.nomActivite.trim(),
        responsableNom: responsable.nomComplet,
        telephone: formulaire.telephone.trim(),
        quartier: formulaire.quartier.trim(),
        avenue: formulaire.avenue.trim(),
        adresse: formulaire.adresse.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setActivites((anciennesActivites) => [
        nouvelleActivite,
        ...anciennesActivites,
      ]);

      setMessage("L’activité a été enregistrée avec succès.");
    }

    fermerFormulaire();
  }

  function ouvrirNouveauFormulaire() {
    setFormulaire(formulaireInitial);
    setActiviteEnModification(null);
    setFormulaireVisible(true);
    setErreur("");
    setMessage("");
  }

  function fermerFormulaire() {
    setFormulaire(formulaireInitial);
    setActiviteEnModification(null);
    setFormulaireVisible(false);
    setErreur("");
  }

  function modifierActivite(activite: Activite) {
    setFormulaire({
      nomActivite: activite.nomActivite,
      typeActivite: activite.typeActivite,
      secteur: activite.secteur,
      responsableId: activite.responsableId,
      telephone: activite.telephone,
      commune: activite.commune,
      quartier: activite.quartier,
      avenue: activite.avenue,
      adresse: activite.adresse,
      dateOuverture: activite.dateOuverture,
      image: activite.image,
      statut: activite.statut,
    });

    setActiviteEnModification(activite.id);
    setFormulaireVisible(true);
    setActiviteConsultee(null);
    setErreur("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function changerStatut(
    id: string,
    nouveauStatut: StatutActivite,
  ) {
    setActivites((anciennesActivites) =>
      anciennesActivites.map((activite) =>
        activite.id === id
          ? {
              ...activite,
              statut: nouveauStatut,
              updatedAt: new Date().toISOString(),
            }
          : activite,
      ),
    );

    setMessage(
      `Le statut de l’activité a été changé en « ${nouveauStatut} ».`,
    );
  }

  function fermerActivite(activite: Activite) {
    const confirmation = window.confirm(
      `Voulez-vous déclarer l’activité « ${activite.nomActivite} » comme fermée ?`,
    );

    if (!confirmation) {
      return;
    }

    changerStatut(activite.id, "Fermé");
  }

  function obtenirStyleStatut(statut: StatutActivite) {
    if (statut === "Autorisé") {
      return "bg-green-100 text-green-800";
    }

    if (statut === "En attente") {
      return "bg-orange-100 text-orange-800";
    }

    if (statut === "À renouveler") {
      return "bg-yellow-100 text-yellow-800";
    }

    if (statut === "Suspendu" || statut === "Refusé") {
      return "bg-red-100 text-red-800";
    }

    if (statut === "Expiré") {
      return "bg-purple-100 text-purple-800";
    }

    return "bg-neutral-200 text-neutral-700";
  }

  function formaterDate(date: string) {
    if (!date) {
      return "Non renseignée";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
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
              <p className="font-black text-black">Province Connect</p>
              <p className="text-xs font-semibold text-black/65">
                Registre des activités
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/personnes"
              className="hidden rounded-xl border border-black/15 bg-white/30 px-4 py-2.5 text-sm font-extrabold text-black transition hover:bg-white/50 sm:inline-flex"
            >
              Personnes
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
              Administration
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-black md:text-4xl">
              Registre des activités
            </h1>

            <p className="mt-3 max-w-3xl leading-7 text-neutral-600">
              Enregistrez les boutiques, entreprises, bureaux, écoles,
              ateliers, studios et autres structures de la province.
            </p>
          </div>

          <button
            type="button"
            onClick={
              formulaireVisible
                ? fermerFormulaire
                : ouvrirNouveauFormulaire
            }
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-6 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
          >
            {formulaireVisible
              ? "Fermer le formulaire"
              : "+ Nouvelle activité"}
          </button>
        </section>

        {personnes.length === 0 && (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-extrabold text-orange-900">
                Aucun responsable disponible
              </p>

              <p className="mt-1 text-sm leading-6 text-orange-800">
                Enregistrez d’abord une personne avant de créer une
                activité.
              </p>
            </div>

            <Link
              href="/admin/personnes"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-extrabold text-white"
            >
              Enregistrer une personne
            </Link>
          </div>
        )}

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
              titre: "Total des activités",
              valeur: statistiques.total,
              couleur: "text-black",
            },
            {
              titre: "Activités autorisées",
              valeur: statistiques.autorisees,
              couleur: "text-green-700",
            },
            {
              titre: "En attente",
              valeur: statistiques.attente,
              couleur: "text-orange-600",
            },
            {
              titre: "Suspendues",
              valeur: statistiques.suspendues,
              couleur: "text-red-700",
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
                Enregistrement
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {activiteEnModification
                  ? "Modifier une activité"
                  : "Nouvelle activité"}
              </h2>
            </div>

            <form
              onSubmit={enregistrerActivite}
              className="grid gap-7 p-6 lg:grid-cols-[1fr_360px]"
            >
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <ChampTexte
                    id="nom-activite"
                    label="Nom de l’activité"
                    value={formulaire.nomActivite}
                    placeholder="Exemple : Boutique Baraka"
                    onChange={(valeur) =>
                      modifierChamp("nomActivite", valeur)
                    }
                  />

                  <div>
                    <label
                      htmlFor="responsable"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Responsable
                    </label>

                    <select
                      id="responsable"
                      value={formulaire.responsableId}
                      onChange={(event) =>
                        choisirResponsable(event.target.value)
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">
                        Sélectionner une personne
                      </option>

                      {personnes.map((personne) => (
                        <option
                          key={personne.id}
                          value={personne.id}
                        >
                          {personne.nomComplet} — {personne.numero}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-extrabold text-black">
                      Type d’activité
                    </label>

                    <select
                      value={formulaire.typeActivite}
                      onChange={(event) =>
                        modifierChamp(
                          "typeActivite",
                          event.target.value,
                        )
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      {typesActivites.map((typeActivite) => (
                        <option
                          key={typeActivite}
                          value={typeActivite}
                        >
                          {typeActivite}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-extrabold text-black">
                      Secteur
                    </label>

                    <select
                      value={formulaire.secteur}
                      onChange={(event) =>
                        modifierChamp("secteur", event.target.value)
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      {secteurs.map((secteur) => (
                        <option key={secteur} value={secteur}>
                          {secteur}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-extrabold text-black">
                      Statut administratif
                    </label>

                    <select
                      value={formulaire.statut}
                      onChange={(event) =>
                        modifierChamp(
                          "statut",
                          event.target.value as StatutActivite,
                        )
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      {statuts.map((statut) => (
                        <option key={statut} value={statut}>
                          {statut}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <ChampTexte
                    id="telephone-activite"
                    label="Téléphone de l’activité"
                    value={formulaire.telephone}
                    placeholder="+243..."
                    onChange={(valeur) =>
                      modifierChamp("telephone", valeur)
                    }
                  />

                  <div>
                    <label className="mb-2 block text-sm font-extrabold text-black">
                      Commune
                    </label>

                    <select
                      value={formulaire.commune}
                      onChange={(event) =>
                        modifierChamp("commune", event.target.value)
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">Sélectionner</option>

                      {communes.map((commune) => (
                        <option key={commune} value={commune}>
                          {commune}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-extrabold text-black">
                      Date d’ouverture déclarée
                    </label>

                    <input
                      type="date"
                      value={formulaire.dateOuverture}
                      onChange={(event) =>
                        modifierChamp(
                          "dateOuverture",
                          event.target.value,
                        )
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <ChampTexte
                    id="quartier"
                    label="Quartier"
                    value={formulaire.quartier}
                    placeholder="Exemple : Ndendere"
                    onChange={(valeur) =>
                      modifierChamp("quartier", valeur)
                    }
                  />

                  <ChampTexte
                    id="avenue"
                    label="Avenue"
                    value={formulaire.avenue}
                    placeholder="Nom de l’avenue"
                    onChange={(valeur) =>
                      modifierChamp("avenue", valeur)
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-extrabold text-black">
                    Adresse détaillée
                  </label>

                  <textarea
                    value={formulaire.adresse}
                    onChange={(event) =>
                      modifierChamp("adresse", event.target.value)
                    }
                    placeholder="Numéro, bâtiment, avenue, repère ou autre précision..."
                    className="min-h-28 w-full resize-y rounded-xl border border-black/15 bg-neutral-50 px-4 py-3 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-black/10 pt-6 sm:flex-row">
                  <button
                    type="submit"
                    className="min-h-14 rounded-xl bg-orange-500 px-7 font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                  >
                    {activiteEnModification
                      ? "Enregistrer les modifications"
                      : "Enregistrer l’activité"}
                  </button>

                  <button
                    type="button"
                    onClick={fermerFormulaire}
                    className="min-h-14 rounded-xl border border-black/15 bg-white px-7 font-extrabold text-black transition hover:bg-neutral-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>

              {/* Image de l’activité */}
              <aside>
                <label className="mb-2 block text-sm font-extrabold text-black">
                  Photo ou enseigne de l’activité
                </label>

                <label
                  htmlFor="image-activite"
                  className="flex min-h-[320px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-black/15 bg-neutral-50 text-center transition hover:border-orange-400 hover:bg-orange-50"
                >
                  {formulaire.image ? (
                    <img
                      src={formulaire.image}
                      alt="Aperçu de l’activité"
                      className="h-[320px] w-full object-cover"
                    />
                  ) : (
                    <div className="p-7">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-xs font-black text-white">
                        PHOTO
                      </div>

                      <p className="mt-5 font-extrabold text-black">
                        Ajouter une image
                      </p>

                      <p className="mt-2 text-sm leading-6 text-neutral-500">
                        Photo de la boutique, du bureau ou de
                        l’enseigne.
                        <br />
                        Taille maximale : 2 Mo.
                      </p>
                    </div>
                  )}
                </label>

                <input
                  id="image-activite"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={importerImage}
                  className="hidden"
                />

                {formulaire.image && (
                  <button
                    type="button"
                    onClick={() => modifierChamp("image", "")}
                    className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 hover:bg-red-100"
                  >
                    Retirer l’image
                  </button>
                )}

                <div className="mt-5 rounded-2xl bg-neutral-100 p-4">
                  <p className="text-sm font-extrabold text-black">
                    Responsable sélectionné
                  </p>

                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    {personnes.find(
                      (personne) =>
                        personne.id === formulaire.responsableId,
                    )?.nomComplet ||
                      "Aucun responsable sélectionné."}
                  </p>
                </div>
              </aside>
            </form>
          </section>
        )}

        {/* Recherche et filtres */}
        <section className="mt-7 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_210px_210px_210px]">
            <input
              type="search"
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher par activité, responsable, numéro ou quartier..."
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />

            <select
              value={filtreType}
              onChange={(event) => setFiltreType(event.target.value)}
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="Tous">Tous les types</option>

              {typesActivites.map((typeActivite) => (
                <option key={typeActivite} value={typeActivite}>
                  {typeActivite}
                </option>
              ))}
            </select>

            <select
              value={filtreCommune}
              onChange={(event) =>
                setFiltreCommune(event.target.value)
              }
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="Toutes">Toutes les communes</option>

              {communes.map((commune) => (
                <option key={commune} value={commune}>
                  {commune}
                </option>
              ))}
            </select>

            <select
              value={filtreStatut}
              onChange={(event) =>
                setFiltreStatut(event.target.value)
              }
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="Tous">Tous les statuts</option>

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
          {activitesFiltrees.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 font-black text-neutral-500">
                ACT
              </div>

              <h2 className="mt-5 text-xl font-black text-black">
                Aucune activité enregistrée
              </h2>

              <p className="mx-auto mt-3 max-w-lg leading-7 text-neutral-500">
                Utilisez le bouton « Nouvelle activité » pour
                commencer l’enregistrement.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1150px] border-collapse text-left">
                  <thead className="bg-neutral-50">
                    <tr className="text-xs uppercase tracking-wider text-neutral-500">
                      <th className="px-5 py-4 font-black">
                        Activité
                      </th>
                      <th className="px-5 py-4 font-black">
                        Numéro
                      </th>
                      <th className="px-5 py-4 font-black">
                        Responsable
                      </th>
                      <th className="px-5 py-4 font-black">
                        Type
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
                    {activitesFiltrees.map((activite) => (
                      <tr
                        key={activite.id}
                        className="border-t border-black/5 transition hover:bg-orange-50/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {activite.image ? (
                              <img
                                src={activite.image}
                                alt={activite.nomActivite}
                                className="h-12 w-12 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-xs font-black text-white">
                                ACT
                              </div>
                            )}

                            <div>
                              <p className="font-extrabold text-black">
                                {activite.nomActivite}
                              </p>

                              <p className="mt-1 text-xs text-neutral-500">
                                {activite.secteur}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm font-extrabold text-black">
                          {activite.numero}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-neutral-700">
                            {activite.responsableNom}
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            {activite.telephone}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600">
                          {activite.typeActivite}
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600">
                          {activite.commune}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold ${obtenirStyleStatut(
                              activite.statut,
                            )}`}
                          >
                            {activite.statut}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setActiviteConsultee(activite)
                              }
                              className="rounded-lg bg-black px-3 py-2 text-xs font-extrabold text-white hover:bg-green-800"
                            >
                              Consulter
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                modifierActivite(activite)
                              }
                              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-700 hover:bg-orange-100"
                            >
                              Modifier
                            </button>

                            {activite.statut !== "Fermé" && (
                              <button
                                type="button"
                                onClick={() =>
                                  fermerActivite(activite)
                                }
                                className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs font-extrabold text-neutral-700 hover:bg-neutral-200"
                              >
                                Fermer
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
      {activiteConsultee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="my-8 w-full max-w-4xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-5 bg-black px-6 py-5 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                  Dossier de l’activité
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {activiteConsultee.nomActivite}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setActiviteConsultee(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl hover:bg-white/20"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="grid gap-7 p-6 md:grid-cols-[250px_1fr]">
              {activiteConsultee.image ? (
                <img
                  src={activiteConsultee.image}
                  alt={activiteConsultee.nomActivite}
                  className="h-64 w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl bg-neutral-200 font-black text-neutral-500">
                  ACTIVITÉ
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <Information
                  label="Numéro provincial"
                  valeur={activiteConsultee.numero}
                />

                <Information
                  label="Responsable"
                  valeur={activiteConsultee.responsableNom}
                />

                <Information
                  label="Type d’activité"
                  valeur={activiteConsultee.typeActivite}
                />

                <Information
                  label="Secteur"
                  valeur={activiteConsultee.secteur}
                />

                <Information
                  label="Téléphone"
                  valeur={activiteConsultee.telephone}
                />

                <Information
                  label="Commune"
                  valeur={activiteConsultee.commune}
                />

                <Information
                  label="Quartier"
                  valeur={activiteConsultee.quartier}
                />

                <Information
                  label="Avenue"
                  valeur={
                    activiteConsultee.avenue ||
                    "Non renseignée"
                  }
                />

                <Information
                  label="Ouverture déclarée"
                  valeur={formaterDate(
                    activiteConsultee.dateOuverture,
                  )}
                />

                <Information
                  label="Statut"
                  valeur={activiteConsultee.statut}
                />
              </div>
            </div>

            <div className="border-t border-black/10 px-6 py-5">
              <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                Adresse détaillée
              </p>

              <p className="mt-2 leading-7 text-neutral-700">
                {activiteConsultee.adresse ||
                  "Aucune précision ajoutée."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    modifierActivite(activiteConsultee)
                  }
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white hover:bg-orange-600"
                >
                  Modifier le dossier
                </button>

                <button
                  type="button"
                  className="rounded-xl bg-black px-5 py-3 text-sm font-extrabold text-white hover:bg-green-800"
                >
                  Préparer une carte d’activité
                </button>

                {activiteConsultee.statut === "En attente" && (
                  <button
                    type="button"
                    onClick={() => {
                      changerStatut(
                        activiteConsultee.id,
                        "Autorisé",
                      );

                      setActiviteConsultee({
                        ...activiteConsultee,
                        statut: "Autorisé",
                      });
                    }}
                    className="rounded-xl bg-green-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-green-800"
                  >
                    Autoriser l’activité
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
  type?: string;
  onChange: (valeur: string) => void;
};

function ChampTexte({
  id,
  label,
  value,
  placeholder,
  type = "text",
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
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
      />
    </div>
  );
}

type InformationProps = {
  label: string;
  valeur: string;
};

function Information({ label, valeur }: InformationProps) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
        {label}
      </p>

      <p className="mt-2 font-extrabold text-black">
        {valeur}
      </p>
    </div>
  );
}



