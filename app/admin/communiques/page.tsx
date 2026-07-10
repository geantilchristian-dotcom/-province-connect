"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type StatutCommunique = "Brouillon" | "Publié";

type Communique = {
  id: string;
  titre: string;
  categorie: string;
  resume: string;
  contenu: string;
  datePublication: string;
  reference: string;
  image: string;
  statut: StatutCommunique;
  createdAt: string;
};

type FormulaireCommunique = {
  titre: string;
  categorie: string;
  resume: string;
  contenu: string;
  datePublication: string;
  reference: string;
  image: string;
  statut: StatutCommunique;
};

const CLE_STOCKAGE = "province-connect-communiques";

const formulaireInitial: FormulaireCommunique = {
  titre: "",
  categorie: "Communiqué officiel",
  resume: "",
  contenu: "",
  datePublication: "",
  reference: "",
  image: "",
  statut: "Brouillon",
};

const categories = [
  "Communiqué officiel",
  "Avis public",
  "Décision provinciale",
  "Information importante",
  "Procédure administrative",
  "Alerte",
  "Annonce",
];

export default function AdminCommuniquesPage() {
  const [communiques, setCommuniques] = useState<Communique[]>([]);
  const [formulaire, setFormulaire] =
    useState<FormulaireCommunique>(formulaireInitial);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [formulaireVisible, setFormulaireVisible] = useState(false);
  const [communiqueEnModification, setCommuniqueEnModification] = useState<
    string | null
  >(null);

  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const donneesEnregistrees = window.localStorage.getItem(CLE_STOCKAGE);

    if (!donneesEnregistrees) {
      return;
    }

    try {
      const donnees: Communique[] = JSON.parse(donneesEnregistrees);
      setCommuniques(donnees);
    } catch {
      setErreur("Impossible de lire les communiqués enregistrés.");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(communiques));
  }, [communiques]);

  const statistiques = useMemo(() => {
    const publies = communiques.filter(
      (communique) => communique.statut === "Publié",
    ).length;

    const brouillons = communiques.filter(
      (communique) => communique.statut === "Brouillon",
    ).length;

    return {
      total: communiques.length,
      publies,
      brouillons,
    };
  }, [communiques]);

  const communiquesFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return communiques.filter((communique) => {
      const correspondRecherche =
        !terme ||
        communique.titre.toLowerCase().includes(terme) ||
        communique.reference.toLowerCase().includes(terme) ||
        communique.categorie.toLowerCase().includes(terme);

      const correspondStatut =
        filtreStatut === "Tous" || communique.statut === filtreStatut;

      return correspondRecherche && correspondStatut;
    });
  }, [communiques, recherche, filtreStatut]);

  function modifierChamp(
    champ: keyof FormulaireCommunique,
    valeur: string,
  ) {
    setFormulaire((ancienFormulaire) => ({
      ...ancienFormulaire,
      [champ]: valeur,
    }));

    setErreur("");
    setMessage("");
  }

  function genererReference() {
    const annee = new Date().getFullYear();
    const numero = String(communiques.length + 1).padStart(4, "0");

    modifierChamp("reference", `PC-COM-${annee}-${numero}`);
  }

  function importerImage(event: ChangeEvent<HTMLInputElement>) {
    const fichier = event.target.files?.[0];

    if (!fichier) {
      return;
    }

    if (!fichier.type.startsWith("image/")) {
      setErreur("Veuillez sélectionner un fichier image valide.");
      return;
    }

    const tailleMaximale = 3 * 1024 * 1024;

    if (fichier.size > tailleMaximale) {
      setErreur("L’image ne doit pas dépasser 3 Mo.");
      return;
    }

    const lecteur = new FileReader();

    lecteur.onload = () => {
      const resultat = lecteur.result;

      if (typeof resultat === "string") {
        modifierChamp("image", resultat);
      }
    };

    lecteur.onerror = () => {
      setErreur("Impossible de lire l’image sélectionnée.");
    };

    lecteur.readAsDataURL(fichier);
  }

  function reinitialiserFormulaire() {
    setFormulaire(formulaireInitial);
    setCommuniqueEnModification(null);
    setFormulaireVisible(false);
    setErreur("");
  }

  function enregistrerCommunique(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur("");
    setMessage("");

    if (!formulaire.titre.trim()) {
      setErreur("Le titre du communiqué est obligatoire.");
      return;
    }

    if (!formulaire.resume.trim()) {
      setErreur("Le résumé du communiqué est obligatoire.");
      return;
    }

    if (!formulaire.datePublication) {
      setErreur("Veuillez choisir une date de publication.");
      return;
    }

    if (!formulaire.reference.trim()) {
      setErreur("La référence du communiqué est obligatoire.");
      return;
    }

    if (!formulaire.image) {
      setErreur("Veuillez ajouter une affiche ou une image.");
      return;
    }

    const referenceExiste = communiques.some(
      (communique) =>
        communique.reference.toLowerCase() ===
          formulaire.reference.trim().toLowerCase() &&
        communique.id !== communiqueEnModification,
    );

    if (referenceExiste) {
      setErreur("Cette référence est déjà utilisée.");
      return;
    }

    if (communiqueEnModification) {
      setCommuniques((anciensCommuniques) =>
        anciensCommuniques.map((communique) =>
          communique.id === communiqueEnModification
            ? {
                ...communique,
                ...formulaire,
                titre: formulaire.titre.trim(),
                resume: formulaire.resume.trim(),
                contenu: formulaire.contenu.trim(),
                reference: formulaire.reference.trim().toUpperCase(),
              }
            : communique,
        ),
      );

      setMessage("Le communiqué a été modifié avec succès.");
    } else {
      const nouveauCommunique: Communique = {
        id: crypto.randomUUID(),
        ...formulaire,
        titre: formulaire.titre.trim(),
        resume: formulaire.resume.trim(),
        contenu: formulaire.contenu.trim(),
        reference: formulaire.reference.trim().toUpperCase(),
        createdAt: new Date().toISOString(),
      };

      setCommuniques((anciensCommuniques) => [
        nouveauCommunique,
        ...anciensCommuniques,
      ]);

      setMessage("Le communiqué a été enregistré avec succès.");
    }

    setFormulaire(formulaireInitial);
    setCommuniqueEnModification(null);
    setFormulaireVisible(false);
  }

  function modifierCommunique(communique: Communique) {
    setFormulaire({
      titre: communique.titre,
      categorie: communique.categorie,
      resume: communique.resume,
      contenu: communique.contenu,
      datePublication: communique.datePublication,
      reference: communique.reference,
      image: communique.image,
      statut: communique.statut,
    });

    setCommuniqueEnModification(communique.id);
    setFormulaireVisible(true);
    setMessage("");
    setErreur("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function changerStatut(id: string) {
    setCommuniques((anciensCommuniques) =>
      anciensCommuniques.map((communique) =>
        communique.id === id
          ? {
              ...communique,
              statut:
                communique.statut === "Publié" ? "Brouillon" : "Publié",
            }
          : communique,
      ),
    );

    setMessage("Le statut du communiqué a été modifié.");
  }

  function supprimerCommunique(id: string) {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer ce communiqué ?",
    );

    if (!confirmation) {
      return;
    }

    setCommuniques((anciensCommuniques) =>
      anciensCommuniques.filter((communique) => communique.id !== id),
    );

    setMessage("Le communiqué a été supprimé.");
  }

  function formaterDate(date: string) {
    if (!date) {
      return "Date non définie";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      {/* Barre supérieure */}
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
                Gestion des communiqués
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden rounded-xl border border-black/15 bg-white/30 px-4 py-2 text-sm font-extrabold text-black transition hover:bg-white/50 sm:inline-flex"
            >
              Voir le site public
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
              Communiqués officiels
            </h1>

            <p className="mt-3 max-w-3xl leading-7 text-neutral-600">
              Ajoutez les affiches, annonces, décisions et informations qui
              seront publiées sur la partie publique de Province Connect.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (formulaireVisible) {
                reinitialiserFormulaire();
              } else {
                setFormulaireVisible(true);
                setMessage("");
                setErreur("");
              }
            }}
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-orange-500 px-6 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
          >
            {formulaireVisible ? "Fermer le formulaire" : "+ Nouveau communiqué"}
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
        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-neutral-500">
              Total des communiqués
            </p>
            <p className="mt-3 text-3xl font-black text-black">
              {statistiques.total}
            </p>
          </article>

          <article className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-neutral-500">
              Communiqués publiés
            </p>
            <p className="mt-3 text-3xl font-black text-green-700">
              {statistiques.publies}
            </p>
          </article>

          <article className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-neutral-500">
              Communiqués en brouillon
            </p>
            <p className="mt-3 text-3xl font-black text-orange-600">
              {statistiques.brouillons}
            </p>
          </article>
        </section>

        {/* Formulaire */}
        {formulaireVisible && (
          <section className="mt-7 overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/10 bg-black px-6 py-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                Publication
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {communiqueEnModification
                  ? "Modifier le communiqué"
                  : "Ajouter un nouveau communiqué"}
              </h2>
            </div>

            <form
              onSubmit={enregistrerCommunique}
              className="grid gap-7 p-6 lg:grid-cols-[1fr_420px]"
            >
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="titre"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Titre du communiqué
                    </label>

                    <input
                      id="titre"
                      type="text"
                      value={formulaire.titre}
                      onChange={(event) =>
                        modifierChamp("titre", event.target.value)
                      }
                      placeholder="Exemple : Campagne provinciale 2026"
                      className="min-h-13 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="categorie"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Catégorie
                    </label>

                    <select
                      id="categorie"
                      value={formulaire.categorie}
                      onChange={(event) =>
                        modifierChamp("categorie", event.target.value)
                      }
                      className="min-h-13 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      {categories.map((categorie) => (
                        <option key={categorie} value={categorie}>
                          {categorie}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="resume"
                    className="mb-2 block text-sm font-extrabold text-black"
                  >
                    Résumé
                  </label>

                  <textarea
                    id="resume"
                    value={formulaire.resume}
                    onChange={(event) =>
                      modifierChamp("resume", event.target.value)
                    }
                    placeholder="Résumé qui sera visible sur la page d’accueil..."
                    maxLength={250}
                    className="min-h-28 w-full resize-y rounded-xl border border-black/15 bg-neutral-50 px-4 py-3 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />

                  <p className="mt-1 text-right text-xs text-neutral-400">
                    {formulaire.resume.length}/250
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="contenu"
                    className="mb-2 block text-sm font-extrabold text-black"
                  >
                    Contenu détaillé
                  </label>

                  <textarea
                    id="contenu"
                    value={formulaire.contenu}
                    onChange={(event) =>
                      modifierChamp("contenu", event.target.value)
                    }
                    placeholder="Écrivez ici le contenu complet du communiqué..."
                    className="min-h-40 w-full resize-y rounded-xl border border-black/15 bg-neutral-50 px-4 py-3 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="date-publication"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Date de publication
                    </label>

                    <input
                      id="date-publication"
                      type="date"
                      value={formulaire.datePublication}
                      onChange={(event) =>
                        modifierChamp("datePublication", event.target.value)
                      }
                      className="min-h-13 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="statut"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Statut
                    </label>

                    <select
                      id="statut"
                      value={formulaire.statut}
                      onChange={(event) =>
                        modifierChamp(
                          "statut",
                          event.target.value as StatutCommunique,
                        )
                      }
                      className="min-h-13 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="Brouillon">Brouillon</option>
                      <option value="Publié">Publié</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reference"
                    className="mb-2 block text-sm font-extrabold text-black"
                  >
                    Numéro de référence
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      id="reference"
                      type="text"
                      value={formulaire.reference}
                      onChange={(event) =>
                        modifierChamp("reference", event.target.value)
                      }
                      placeholder="PC-COM-2026-0001"
                      className="min-h-13 flex-1 rounded-xl border border-black/15 bg-neutral-50 px-4 uppercase outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />

                    <button
                      type="button"
                      onClick={genererReference}
                      className="min-h-13 rounded-xl bg-black px-5 text-sm font-extrabold text-white transition hover:bg-green-800"
                    >
                      Générer
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-black/10 pt-6 sm:flex-row">
                  <button
                    type="submit"
                    className="min-h-13 rounded-xl bg-orange-500 px-7 font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                  >
                    {communiqueEnModification
                      ? "Enregistrer les modifications"
                      : "Enregistrer le communiqué"}
                  </button>

                  <button
                    type="button"
                    onClick={reinitialiserFormulaire}
                    className="min-h-13 rounded-xl border border-black/15 bg-white px-7 font-extrabold text-black transition hover:bg-neutral-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>

              {/* Image */}
              <aside>
                <label className="mb-2 block text-sm font-extrabold text-black">
                  Affiche du communiqué
                </label>

                <label
                  htmlFor="image-communique"
                  className="flex min-h-[260px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-black/15 bg-neutral-50 text-center transition hover:border-orange-400 hover:bg-orange-50"
                >
                  {formulaire.image ? (
                    <img
                      src={formulaire.image}
                      alt="Aperçu de l’affiche"
                      className="h-full min-h-[260px] w-full object-cover"
                    />
                  ) : (
                    <div className="p-7">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 font-black text-white">
                        IMG
                      </div>

                      <p className="mt-5 font-extrabold text-black">
                        Cliquez pour choisir une affiche
                      </p>

                      <p className="mt-2 text-sm leading-6 text-neutral-500">
                        Formats recommandés : JPG, PNG ou WEBP.
                        <br />
                        Taille maximale : 3 Mo.
                      </p>
                    </div>
                  )}
                </label>

                <input
                  id="image-communique"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={importerImage}
                  className="hidden"
                />

                {formulaire.image && (
                  <button
                    type="button"
                    onClick={() => modifierChamp("image", "")}
                    className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                  >
                    Retirer l’image
                  </button>
                )}

                <div className="mt-5 rounded-2xl bg-neutral-100 p-4">
                  <p className="text-sm font-extrabold text-black">
                    Conseil d’affichage
                  </p>

                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Utilisez une affiche horizontale avec un texte lisible.
                    L’image sera affichée dans le carrousel du site public.
                  </p>
                </div>
              </aside>
            </form>
          </section>
        )}

        {/* Recherche et filtre */}
        <section className="mt-7 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <input
              type="search"
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher par titre, catégorie ou référence..."
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />

            <select
              value={filtreStatut}
              onChange={(event) => setFiltreStatut(event.target.value)}
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 font-bold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="Tous">Tous les statuts</option>
              <option value="Publié">Publiés</option>
              <option value="Brouillon">Brouillons</option>
            </select>
          </div>
        </section>

        {/* Liste */}
        <section className="mt-7">
          {communiquesFiltres.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 font-black text-neutral-500">
                COM
              </div>

              <h2 className="mt-5 text-xl font-black text-black">
                Aucun communiqué
              </h2>

              <p className="mx-auto mt-3 max-w-lg leading-7 text-neutral-500">
                Ajoutez votre premier communiqué pour commencer à publier des
                affiches sur le site public.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {communiquesFiltres.map((communique) => (
                <article
                  key={communique.id}
                  className="overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-sm"
                >
                  <div className="grid sm:grid-cols-[190px_1fr]">
                    <div className="min-h-[220px] bg-neutral-200">
                      <img
                        src={communique.image}
                        alt={communique.titre}
                        className="h-full min-h-[220px] w-full object-cover"
                      />
                    </div>

                    <div className="flex min-w-0 flex-col p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-black ${
                            communique.statut === "Publié"
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {communique.statut}
                        </span>

                        <span className="text-xs font-bold text-neutral-400">
                          {formaterDate(communique.datePublication)}
                        </span>
                      </div>

                      <p className="mt-4 text-xs font-black uppercase tracking-wider text-orange-600">
                        {communique.categorie}
                      </p>

                      <h3 className="mt-2 text-xl font-black leading-tight text-black">
                        {communique.titre}
                      </h3>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
                        {communique.resume}
                      </p>

                      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Réf. {communique.reference}
                      </p>

                      <div className="mt-auto flex flex-wrap gap-2 pt-5">
                        <button
                          type="button"
                          onClick={() => modifierCommunique(communique)}
                          className="rounded-xl bg-black px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-green-800"
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          onClick={() => changerStatut(communique.id)}
                          className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-extrabold text-orange-700 transition hover:bg-orange-100"
                        >
                          {communique.statut === "Publié"
                            ? "Mettre en brouillon"
                            : "Publier"}
                        </button>

                        <button
                          type="button"
                          onClick={() => supprimerCommunique(communique.id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}



