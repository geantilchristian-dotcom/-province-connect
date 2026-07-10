"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

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

function mapperDepuisSupabase(row: Record<string, unknown>): Communique {
  return {
    id: row.id as string,
    titre: row.titre as string,
    categorie: row.categorie as string,
    resume: row.resume as string,
    contenu: row.contenu as string,
    datePublication: (row.date_publication as string) ?? "",
    reference: row.reference as string,
    image: row.image as string,
    statut: row.statut as StatutCommunique,
    createdAt: row.created_at as string,
  };
}

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
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);

  // ── Chargement initial depuis Supabase ──────────────────────────────
  useEffect(() => {
    async function charger() {
      setChargement(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("communiques")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setErreur("Impossible de charger les communiqués.");
      } else {
        setCommuniques(
          (data as Record<string, unknown>[]).map(mapperDepuisSupabase),
        );
      }

      setChargement(false);
    }

    void charger();
  }, []);

  // ── Statistiques ────────────────────────────────────────────────────
  const statistiques = useMemo(() => {
    const publies = communiques.filter((c) => c.statut === "Publié").length;
    const brouillons = communiques.filter(
      (c) => c.statut === "Brouillon",
    ).length;
    return { total: communiques.length, publies, brouillons };
  }, [communiques]);

  // ── Filtrage ────────────────────────────────────────────────────────
  const communiquesFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return communiques.filter((c) => {
      const correspondRecherche =
        !terme ||
        c.titre.toLowerCase().includes(terme) ||
        c.reference.toLowerCase().includes(terme) ||
        c.categorie.toLowerCase().includes(terme);
      const correspondStatut =
        filtreStatut === "Tous" || c.statut === filtreStatut;
      return correspondRecherche && correspondStatut;
    });
  }, [communiques, recherche, filtreStatut]);

  // ── Formulaire ──────────────────────────────────────────────────────
  function modifierChamp(champ: keyof FormulaireCommunique, valeur: string) {
    setFormulaire((ancien) => ({ ...ancien, [champ]: valeur }));
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
    if (!fichier) return;
    if (!fichier.type.startsWith("image/")) {
      setErreur("Veuillez sélectionner un fichier image valide.");
      return;
    }
    const tailleMaximale = 3 * 1024 * 1024;
    if (fichier.size > tailleMaximale) {
      setErreur("L'image ne doit pas dépasser 3 Mo.");
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const resultat = lecteur.result;
      if (typeof resultat === "string") modifierChamp("image", resultat);
    };
    lecteur.onerror = () => setErreur("Impossible de lire l'image sélectionnée.");
    lecteur.readAsDataURL(fichier);
  }

  function reinitialiserFormulaire() {
    setFormulaire(formulaireInitial);
    setCommuniqueEnModification(null);
    setFormulaireVisible(false);
    setErreur("");
  }

  // ── Enregistrement (création ou modification) ───────────────────────
  async function enregistrerCommunique(event: FormEvent<HTMLFormElement>) {
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
      (c) =>
        c.reference.toLowerCase() ===
          formulaire.reference.trim().toLowerCase() &&
        c.id !== communiqueEnModification,
    );
    if (referenceExiste) {
      setErreur("Cette référence est déjà utilisée.");
      return;
    }

    setEnregistrementEnCours(true);

    const corps = {
      titre: formulaire.titre.trim(),
      categorie: formulaire.categorie,
      resume: formulaire.resume.trim(),
      contenu: formulaire.contenu.trim(),
      datePublication: formulaire.datePublication,
      reference: formulaire.reference.trim().toUpperCase(),
      image: formulaire.image,
      statut: formulaire.statut,
    };

    if (communiqueEnModification) {
      const reponse = await fetch(
        `/api/communiques/${communiqueEnModification}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corps),
        },
      );

      const json = (await reponse.json()) as {
        succes: boolean;
        communique?: Record<string, unknown>;
      };

      if (json.succes && json.communique) {
        setCommuniques((anciens) =>
          anciens.map((c) =>
            c.id === communiqueEnModification
              ? mapperDepuisSupabase(json.communique!)
              : c,
          ),
        );
        setMessage("Le communiqué a été modifié avec succès.");
      } else {
        setErreur("Erreur lors de la modification.");
      }
    } else {
      const reponse = await fetch("/api/communiques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });

      const json = (await reponse.json()) as {
        succes: boolean;
        communique?: Record<string, unknown>;
      };

      if (json.succes && json.communique) {
        setCommuniques((anciens) => [
          mapperDepuisSupabase(json.communique!),
          ...anciens,
        ]);
        setMessage("Le communiqué a été enregistré avec succès.");
      } else {
        setErreur("Erreur lors de l'enregistrement.");
      }
    }

    setEnregistrementEnCours(false);
    reinitialiserFormulaire();
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Changement de statut (Brouillon ↔ Publié) + notification push ──
  async function changerStatut(id: string) {
    const communique = communiques.find((c) => c.id === id);
    if (!communique) return;

    const nouveauStatut: StatutCommunique =
      communique.statut === "Publié" ? "Brouillon" : "Publié";

    const reponse = await fetch(`/api/communiques/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: nouveauStatut }),
    });

    const json = (await reponse.json()) as { succes: boolean };

    if (json.succes) {
      setCommuniques((anciens) =>
        anciens.map((c) =>
          c.id === id ? { ...c, statut: nouveauStatut } : c,
        ),
      );
      setMessage("Le statut du communiqué a été modifié.");

      // Envoyer une notification push à tous les abonnés lors de la publication
      if (nouveauStatut === "Publié") {
        void fetch("/api/notifications/broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titre: communique.titre,
            body: communique.resume || "Un nouveau communiqué a été publié.",
            url: "/",
            tag: `communique-${id}`,
          }),
        });
      }
    } else {
      setErreur("Impossible de changer le statut.");
    }
  }

  // ── Suppression ─────────────────────────────────────────────────────
  async function supprimerCommunique(id: string) {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer ce communiqué ?",
    );
    if (!confirmation) return;

    const reponse = await fetch(`/api/communiques/${id}`, {
      method: "DELETE",
    });

    const json = (await reponse.json()) as { succes: boolean };

    if (json.succes) {
      setCommuniques((anciens) => anciens.filter((c) => c.id !== id));
      setMessage("Le communiqué a été supprimé.");
    } else {
      setErreur("Impossible de supprimer le communiqué.");
    }
  }

  function formaterDate(date: string) {
    if (!date) return "Date non définie";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  }

  // ── Rendu ────────────────────────────────────────────────────────────
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
              <p className="font-black text-black">Communiqués</p>
              <p className="text-xs font-semibold text-black/70">
                Gestion des communiqués officiels
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="hidden rounded-xl bg-black/10 px-4 py-2 text-sm font-extrabold text-black transition hover:bg-black hover:text-white sm:block"
            >
              ← Tableau de bord
            </Link>
            <button
              type="button"
              onClick={() => {
                reinitialiserFormulaire();
                setFormulaireVisible(true);
              }}
              className="rounded-xl bg-black px-4 py-2 text-sm font-extrabold text-white transition hover:bg-green-800"
            >
              + Nouveau
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Messages */}
        {message && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-green-50 px-5 py-4 text-sm font-bold text-green-800 shadow-sm">
            <p>{message}</p>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="shrink-0 text-lg text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        )}

        {erreur && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-red-800 shadow-sm">
            <p>{erreur}</p>
            <button
              type="button"
              onClick={() => setErreur("")}
              className="shrink-0 text-lg text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Statistiques */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            { label: "Total", valeur: statistiques.total, couleur: "bg-black" },
            { label: "Publiés", valeur: statistiques.publies, couleur: "bg-green-700" },
            { label: "Brouillons", valeur: statistiques.brouillons, couleur: "bg-orange-500" },
          ].map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-bold text-neutral-500">{stat.label}</p>
              <p className={`mt-2 text-3xl font-black text-neutral-950`}>
                {stat.valeur}
              </p>
            </article>
          ))}
        </div>

        {/* Formulaire de création / modification */}
        {formulaireVisible && (
          <section className="mb-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black">
                {communiqueEnModification
                  ? "Modifier le communiqué"
                  : "Nouveau communiqué"}
              </h2>
              <button
                type="button"
                onClick={reinitialiserFormulaire}
                className="text-2xl text-neutral-400 hover:text-black"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => void enregistrerCommunique(e)} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                {/* Titre */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-extrabold">
                    Titre *
                  </label>
                  <input
                    type="text"
                    value={formulaire.titre}
                    onChange={(e) => modifierChamp("titre", e.target.value)}
                    className="w-full rounded-xl border border-black/20 px-4 py-3 text-sm font-semibold focus:border-orange-500 focus:outline-none"
                    placeholder="Titre du communiqué"
                    required
                  />
                </div>

                {/* Catégorie */}
                <div>
                  <label className="mb-2 block text-sm font-extrabold">
                    Catégorie *
                  </label>
                  <select
                    value={formulaire.categorie}
                    onChange={(e) => modifierChamp("categorie", e.target.value)}
                    className="w-full rounded-xl border border-black/20 px-4 py-3 text-sm font-semibold focus:border-orange-500 focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Statut */}
                <div>
                  <label className="mb-2 block text-sm font-extrabold">
                    Statut
                  </label>
                  <select
                    value={formulaire.statut}
                    onChange={(e) =>
                      modifierChamp(
                        "statut",
                        e.target.value as StatutCommunique,
                      )
                    }
                    className="w-full rounded-xl border border-black/20 px-4 py-3 text-sm font-semibold focus:border-orange-500 focus:outline-none"
                  >
                    <option value="Brouillon">Brouillon</option>
                    <option value="Publié">Publié</option>
                  </select>
                </div>

                {/* Date de publication */}
                <div>
                  <label className="mb-2 block text-sm font-extrabold">
                    Date de publication *
                  </label>
                  <input
                    type="date"
                    value={formulaire.datePublication}
                    onChange={(e) =>
                      modifierChamp("datePublication", e.target.value)
                    }
                    className="w-full rounded-xl border border-black/20 px-4 py-3 text-sm font-semibold focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Référence */}
                <div>
                  <label className="mb-2 block text-sm font-extrabold">
                    Référence *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formulaire.reference}
                      onChange={(e) =>
                        modifierChamp(
                          "reference",
                          e.target.value.toUpperCase(),
                        )
                      }
                      className="flex-1 rounded-xl border border-black/20 px-4 py-3 text-sm font-semibold focus:border-orange-500 focus:outline-none"
                      placeholder="PC-COM-2026-0001"
                      required
                    />
                    <button
                      type="button"
                      onClick={genererReference}
                      className="rounded-xl bg-neutral-100 px-4 py-3 text-sm font-extrabold hover:bg-black hover:text-white"
                    >
                      Générer
                    </button>
                  </div>
                </div>

                {/* Résumé */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-extrabold">
                    Résumé *
                  </label>
                  <textarea
                    value={formulaire.resume}
                    onChange={(e) => modifierChamp("resume", e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-black/20 px-4 py-3 text-sm font-semibold focus:border-orange-500 focus:outline-none"
                    placeholder="Résumé visible sur la page d'accueil"
                    required
                  />
                </div>

                {/* Contenu */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-extrabold">
                    Contenu complet
                  </label>
                  <textarea
                    value={formulaire.contenu}
                    onChange={(e) => modifierChamp("contenu", e.target.value)}
                    rows={5}
                    className="w-full rounded-xl border border-black/20 px-4 py-3 text-sm font-semibold focus:border-orange-500 focus:outline-none"
                    placeholder="Contenu intégral du communiqué (optionnel)"
                  />
                </div>

                {/* Image */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-extrabold">
                    Affiche / Image *
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="url"
                      value={
                        formulaire.image.startsWith("data:")
                          ? ""
                          : formulaire.image
                      }
                      onChange={(e) => modifierChamp("image", e.target.value)}
                      className="flex-1 rounded-xl border border-black/20 px-4 py-3 text-sm font-semibold focus:border-orange-500 focus:outline-none"
                      placeholder="URL de l'image (https://...)"
                    />
                    <span className="flex items-center text-xs font-bold text-neutral-400">
                      ou
                    </span>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-black/20 px-4 py-3 text-sm font-bold text-neutral-600 hover:border-orange-500 hover:text-orange-600">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={importerImage}
                        className="hidden"
                      />
                      Importer un fichier
                    </label>
                  </div>
                  {formulaire.image && (
                    <img
                      src={formulaire.image}
                      alt="Aperçu"
                      className="mt-3 h-32 w-full rounded-xl object-cover"
                    />
                  )}
                </div>
              </div>

              {erreur && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {erreur}
                </p>
              )}

              <div className="flex flex-wrap gap-3 border-t border-black/10 pt-5">
                <button
                  type="submit"
                  disabled={enregistrementEnCours}
                  className="rounded-xl bg-black px-6 py-3 text-sm font-extrabold text-white transition hover:bg-green-800 disabled:opacity-60"
                >
                  {enregistrementEnCours
                    ? "Enregistrement…"
                    : communiqueEnModification
                      ? "Enregistrer les modifications"
                      : "Créer le communiqué"}
                </button>
                <button
                  type="button"
                  onClick={reinitialiserFormulaire}
                  className="rounded-xl border border-black/20 px-6 py-3 text-sm font-extrabold transition hover:bg-neutral-100"
                >
                  Annuler
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Filtres */}
        <section className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher par titre, référence…"
              className="flex-1 rounded-xl border border-black/20 bg-white px-4 py-3 text-sm font-semibold focus:border-orange-500 focus:outline-none"
            />
            <select
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value)}
              className="rounded-xl border border-black/20 bg-white px-4 py-3 text-sm font-semibold focus:border-orange-500 focus:outline-none"
            >
              <option value="Tous">Tous les statuts</option>
              <option value="Publié">Publiés</option>
              <option value="Brouillon">Brouillons</option>
            </select>
          </div>
        </section>

        {/* Liste */}
        <section>
          {chargement ? (
            <div className="flex items-center justify-center rounded-2xl bg-white py-20 shadow-sm">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                <p className="mt-4 text-sm font-bold text-neutral-500">
                  Chargement des communiqués…
                </p>
              </div>
            </div>
          ) : communiquesFiltres.length === 0 ? (
            <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
              <p className="text-2xl font-black text-neutral-300">
                Aucun communiqué
              </p>
              <p className="mt-2 text-sm font-semibold text-neutral-400">
                {recherche || filtreStatut !== "Tous"
                  ? "Aucun résultat pour cette recherche."
                  : "Créez votre premier communiqué en cliquant sur « + Nouveau »."}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {communiquesFiltres.map((communique) => (
                <article
                  key={communique.id}
                  className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm"
                >
                  {communique.image && (
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={communique.image}
                        alt={communique.titre}
                        className="h-full w-full object-cover"
                      />
                      <span
                        className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-black ${
                          communique.statut === "Publié"
                            ? "bg-green-600 text-white"
                            : "bg-neutral-800 text-white"
                        }`}
                      >
                        {communique.statut}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-600">
                      {communique.categorie}
                    </p>
                    <h3 className="mt-2 text-base font-black leading-snug text-neutral-950">
                      {communique.titre}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-neutral-500">
                      {formaterDate(communique.datePublication)}
                    </p>
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
                        onClick={() => void changerStatut(communique.id)}
                        className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-extrabold text-orange-700 transition hover:bg-orange-100"
                      >
                        {communique.statut === "Publié"
                          ? "Mettre en brouillon"
                          : "Publier"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void supprimerCommunique(communique.id)}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                      >
                        Supprimer
                      </button>
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
