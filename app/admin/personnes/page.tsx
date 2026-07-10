"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type StatutPersonne = "Actif" | "En attente" | "Suspendu" | "Archivé";

type Personne = {
  id: string;
  numero: string;
  nomComplet: string;
  sexe: string;
  dateNaissance: string;
  telephone: string;
  email: string;
  typePersonne: string;
  commune: string;
  quartier: string;
  avenue: string;
  adresse: string;
  photo: string;
  statut: StatutPersonne;
  createdAt: string;
  updatedAt: string;
};

type FormulairePersonne = {
  nomComplet: string;
  sexe: string;
  dateNaissance: string;
  telephone: string;
  email: string;
  typePersonne: string;
  commune: string;
  quartier: string;
  avenue: string;
  adresse: string;
  photo: string;
  statut: StatutPersonne;
};

const CLE_STOCKAGE = "province-connect-personnes";

const formulaireInitial: FormulairePersonne = {
  nomComplet: "",
  sexe: "",
  dateNaissance: "",
  telephone: "",
  email: "",
  typePersonne: "Commerçant",
  commune: "",
  quartier: "",
  avenue: "",
  adresse: "",
  photo: "",
  statut: "En attente",
};

const typesPersonnes = [
  "Commerçant",
  "Artiste",
  "Enseignant",
  "Transporteur",
  "Pasteur",
  "Responsable d’activité",
  "Agent administratif",
  "Responsable de structure",
  "Autre",
];

const communes = [
  "Ibanda",
  "Kadutu",
  "Bagira",
  "Commune rurale",
  "Autre commune",
];

export default function AdminPersonnesPage() {
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [donneesChargees, setDonneesChargees] = useState(false);

  const [formulaire, setFormulaire] =
    useState<FormulairePersonne>(formulaireInitial);

  const [formulaireVisible, setFormulaireVisible] = useState(false);

  const [personneEnModification, setPersonneEnModification] = useState<
    string | null
  >(null);

  const [personneConsultee, setPersonneConsultee] =
    useState<Personne | null>(null);

  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("Tous");
  const [filtreStatut, setFiltreStatut] = useState("Tous");

  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  /*
   * Chargement des personnes enregistrées.
   * donneesChargees empêche l’écrasement du stockage par une liste vide.
   */
  useEffect(() => {
    try {
      const donneesEnregistrees =
        window.localStorage.getItem(CLE_STOCKAGE);

      if (donneesEnregistrees) {
        const donnees: Personne[] = JSON.parse(donneesEnregistrees);

        if (Array.isArray(donnees)) {
          setPersonnes(donnees);
        }
      }
    } catch {
      setErreur("Impossible de lire les personnes enregistrées.");
    } finally {
      setDonneesChargees(true);
    }
  }, []);

  /*
   * Sauvegarde automatique après le chargement initial.
   */
  useEffect(() => {
    if (!donneesChargees) {
      return;
    }

    window.localStorage.setItem(
      CLE_STOCKAGE,
      JSON.stringify(personnes),
    );
  }, [personnes, donneesChargees]);

  const statistiques = useMemo(() => {
    return {
      total: personnes.length,

      actives: personnes.filter(
        (personne) => personne.statut === "Actif",
      ).length,

      attente: personnes.filter(
        (personne) => personne.statut === "En attente",
      ).length,

      archivees: personnes.filter(
        (personne) => personne.statut === "Archivé",
      ).length,
    };
  }, [personnes]);

  const personnesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return personnes.filter((personne) => {
      const correspondRecherche =
        !terme ||
        personne.nomComplet.toLowerCase().includes(terme) ||
        personne.telephone.toLowerCase().includes(terme) ||
        personne.numero.toLowerCase().includes(terme) ||
        personne.commune.toLowerCase().includes(terme) ||
        personne.quartier.toLowerCase().includes(terme);

      const correspondType =
        filtreType === "Tous" ||
        personne.typePersonne === filtreType;

      const correspondStatut =
        filtreStatut === "Tous" ||
        personne.statut === filtreStatut;

      return (
        correspondRecherche &&
        correspondType &&
        correspondStatut
      );
    });
  }, [personnes, recherche, filtreType, filtreStatut]);

  function modifierChamp<K extends keyof FormulairePersonne>(
    champ: K,
    valeur: FormulairePersonne[K],
  ) {
    setFormulaire((ancienFormulaire) => ({
      ...ancienFormulaire,
      [champ]: valeur,
    }));

    setErreur("");
    setMessage("");
  }

  function genererNumeroPersonne() {
    const annee = new Date().getFullYear();

    const plusGrandNumero = personnes.reduce(
      (valeurMaximale, personne) => {
        const dernierePartie = personne.numero.split("-").pop();
        const numero = Number(dernierePartie);

        if (!Number.isFinite(numero)) {
          return valeurMaximale;
        }

        return Math.max(valeurMaximale, numero);
      },
      0,
    );

    return `PC-PER-${annee}-${String(
      plusGrandNumero + 1,
    ).padStart(6, "0")}`;
  }

  function importerPhoto(event: ChangeEvent<HTMLInputElement>) {
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
      setErreur("La photo ne doit pas dépasser 2 Mo.");
      return;
    }

    const lecteur = new FileReader();

    lecteur.onload = () => {
      if (typeof lecteur.result === "string") {
        modifierChamp("photo", lecteur.result);
      }
    };

    lecteur.onerror = () => {
      setErreur("Impossible de lire la photo sélectionnée.");
    };

    lecteur.readAsDataURL(fichier);
  }

  function verifierFormulaire() {
    if (!formulaire.nomComplet.trim()) {
      return "Le nom complet est obligatoire.";
    }

    if (!formulaire.sexe) {
      return "Veuillez sélectionner le sexe.";
    }

    if (!formulaire.telephone.trim()) {
      return "Le numéro de téléphone est obligatoire.";
    }

    if (!formulaire.commune) {
      return "Veuillez sélectionner une commune.";
    }

    if (!formulaire.quartier.trim()) {
      return "Le quartier est obligatoire.";
    }

    if (!formulaire.photo) {
      return "Veuillez ajouter la photo du titulaire.";
    }

    const telephoneExiste = personnes.some(
      (personne) =>
        personne.telephone.trim() === formulaire.telephone.trim() &&
        personne.id !== personneEnModification,
    );

    if (telephoneExiste) {
      return "Ce numéro de téléphone est déjà utilisé.";
    }

    const emailNettoye = formulaire.email.trim().toLowerCase();

    if (emailNettoye) {
      const emailExiste = personnes.some(
        (personne) =>
          personne.email.trim().toLowerCase() === emailNettoye &&
          personne.id !== personneEnModification,
      );

      if (emailExiste) {
        return "Cette adresse e-mail est déjà utilisée.";
      }
    }

    return "";
  }

  function enregistrerPersonne(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErreur("");
    setMessage("");

    const erreurValidation = verifierFormulaire();

    if (erreurValidation) {
      setErreur(erreurValidation);
      return;
    }

    const maintenant = new Date().toISOString();

    if (personneEnModification) {
      setPersonnes((anciennesPersonnes) =>
        anciennesPersonnes.map((personne) =>
          personne.id === personneEnModification
            ? {
                ...personne,
                ...formulaire,
                nomComplet: formulaire.nomComplet.trim(),
                telephone: formulaire.telephone.trim(),
                email: formulaire.email.trim().toLowerCase(),
                quartier: formulaire.quartier.trim(),
                avenue: formulaire.avenue.trim(),
                adresse: formulaire.adresse.trim(),
                updatedAt: maintenant,
              }
            : personne,
        ),
      );

      setMessage(
        "Les informations de la personne ont été modifiées avec succès.",
      );
    } else {
      const nouvellePersonne: Personne = {
        id: crypto.randomUUID(),
        numero: genererNumeroPersonne(),
        ...formulaire,
        nomComplet: formulaire.nomComplet.trim(),
        telephone: formulaire.telephone.trim(),
        email: formulaire.email.trim().toLowerCase(),
        quartier: formulaire.quartier.trim(),
        avenue: formulaire.avenue.trim(),
        adresse: formulaire.adresse.trim(),
        createdAt: maintenant,
        updatedAt: maintenant,
      };

      setPersonnes((anciennesPersonnes) => [
        nouvellePersonne,
        ...anciennesPersonnes,
      ]);

      setMessage("La personne a été enregistrée avec succès.");
    }

    fermerFormulaire(false);
  }

  function ouvrirNouveauFormulaire() {
    setFormulaire(formulaireInitial);
    setPersonneEnModification(null);
    setPersonneConsultee(null);
    setFormulaireVisible(true);
    setErreur("");
    setMessage("");
  }

  function modifierPersonne(personne: Personne) {
    setFormulaire({
      nomComplet: personne.nomComplet,
      sexe: personne.sexe,
      dateNaissance: personne.dateNaissance,
      telephone: personne.telephone,
      email: personne.email,
      typePersonne: personne.typePersonne,
      commune: personne.commune,
      quartier: personne.quartier,
      avenue: personne.avenue,
      adresse: personne.adresse,
      photo: personne.photo,
      statut: personne.statut,
    });

    setPersonneEnModification(personne.id);
    setPersonneConsultee(null);
    setFormulaireVisible(true);
    setErreur("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function fermerFormulaire(effacerMessage = true) {
    setFormulaire(formulaireInitial);
    setPersonneEnModification(null);
    setFormulaireVisible(false);
    setErreur("");

    if (effacerMessage) {
      setMessage("");
    }
  }

  function changerStatut(
    id: string,
    nouveauStatut: StatutPersonne,
  ) {
    const maintenant = new Date().toISOString();

    setPersonnes((anciennesPersonnes) =>
      anciennesPersonnes.map((personne) =>
        personne.id === id
          ? {
              ...personne,
              statut: nouveauStatut,
              updatedAt: maintenant,
            }
          : personne,
      ),
    );

    setPersonneConsultee((anciennePersonne) =>
      anciennePersonne?.id === id
        ? {
            ...anciennePersonne,
            statut: nouveauStatut,
            updatedAt: maintenant,
          }
        : anciennePersonne,
    );

    setMessage(`Le statut a été changé en « ${nouveauStatut} ».`);
  }

  function archiverPersonne(personne: Personne) {
    const confirmation = window.confirm(
      `Voulez-vous archiver le dossier de ${personne.nomComplet} ?`,
    );

    if (!confirmation) {
      return;
    }

    changerStatut(personne.id, "Archivé");
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

  function obtenirStyleStatut(statut: StatutPersonne) {
    if (statut === "Actif") {
      return "bg-green-100 text-green-800";
    }

    if (statut === "En attente") {
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
                Registre des personnes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/activites"
              className="hidden rounded-xl border border-black/15 bg-white/30 px-4 py-2.5 text-sm font-extrabold text-black transition hover:bg-white/50 sm:inline-flex"
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
              Administration
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-black md:text-4xl">
              Registre des personnes
            </h1>

            <p className="mt-3 max-w-3xl leading-7 text-neutral-600">
              Enregistrez les commerçants, artistes, enseignants,
              transporteurs et autres professionnels de la province.
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
              : "+ Nouvelle personne"}
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
              titre: "Total enregistré",
              valeur: statistiques.total,
              couleur: "text-black",
            },
            {
              titre: "Personnes actives",
              valeur: statistiques.actives,
              couleur: "text-green-700",
            },
            {
              titre: "En attente",
              valeur: statistiques.attente,
              couleur: "text-orange-600",
            },
            {
              titre: "Archivées",
              valeur: statistiques.archivees,
              couleur: "text-neutral-600",
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
                {personneEnModification
                  ? "Modifier une personne"
                  : "Nouvelle personne"}
              </h2>
            </div>

            <form
              onSubmit={enregistrerPersonne}
              className="grid gap-7 p-6 lg:grid-cols-[1fr_340px]"
            >
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <ChampTexte
                    id="nom-complet"
                    label="Nom complet"
                    value={formulaire.nomComplet}
                    placeholder="Nom, postnom et prénom"
                    onChange={(valeur) =>
                      modifierChamp("nomComplet", valeur)
                    }
                  />

                  <div>
                    <label
                      htmlFor="sexe"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Sexe
                    </label>

                    <select
                      id="sexe"
                      value={formulaire.sexe}
                      onChange={(event) =>
                        modifierChamp("sexe", event.target.value)
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">Sélectionner</option>
                      <option value="Masculin">Masculin</option>
                      <option value="Féminin">Féminin</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label
                      htmlFor="date-naissance"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Date de naissance
                    </label>

                    <input
                      id="date-naissance"
                      type="date"
                      value={formulaire.dateNaissance}
                      onChange={(event) =>
                        modifierChamp(
                          "dateNaissance",
                          event.target.value,
                        )
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <ChampTexte
                    id="telephone"
                    label="Téléphone"
                    value={formulaire.telephone}
                    placeholder="+243..."
                    type="tel"
                    onChange={(valeur) =>
                      modifierChamp("telephone", valeur)
                    }
                  />

                  <ChampTexte
                    id="email"
                    label="Adresse e-mail"
                    value={formulaire.email}
                    placeholder="Facultatif"
                    type="email"
                    onChange={(valeur) =>
                      modifierChamp("email", valeur)
                    }
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label
                      htmlFor="type-personne"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Type de personne
                    </label>

                    <select
                      id="type-personne"
                      value={formulaire.typePersonne}
                      onChange={(event) =>
                        modifierChamp(
                          "typePersonne",
                          event.target.value,
                        )
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      {typesPersonnes.map((typePersonne) => (
                        <option
                          key={typePersonne}
                          value={typePersonne}
                        >
                          {typePersonne}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="commune"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Commune
                    </label>

                    <select
                      id="commune"
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
                          event.target.value as StatutPersonne,
                        )
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="En attente">En attente</option>
                      <option value="Actif">Actif</option>
                      <option value="Suspendu">Suspendu</option>
                      <option value="Archivé">Archivé</option>
                    </select>
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
                  <label
                    htmlFor="adresse"
                    className="mb-2 block text-sm font-extrabold text-black"
                  >
                    Adresse détaillée
                  </label>

                  <textarea
                    id="adresse"
                    value={formulaire.adresse}
                    onChange={(event) =>
                      modifierChamp("adresse", event.target.value)
                    }
                    placeholder="Numéro, avenue, repère ou autre précision..."
                    className="min-h-28 w-full resize-y rounded-xl border border-black/15 bg-neutral-50 px-4 py-3 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-black/10 pt-6 sm:flex-row">
                  <button
                    type="submit"
                    className="min-h-14 rounded-xl bg-orange-500 px-7 font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                  >
                    {personneEnModification
                      ? "Enregistrer les modifications"
                      : "Enregistrer la personne"}
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

              {/* Photo */}
              <aside>
                <label className="mb-2 block text-sm font-extrabold text-black">
                  Photo du titulaire
                </label>

                <label
                  htmlFor="photo-personne"
                  className="flex min-h-[330px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-black/15 bg-neutral-50 text-center transition hover:border-orange-400 hover:bg-orange-50"
                >
                  {formulaire.photo ? (
                    <img
                      src={formulaire.photo}
                      alt="Photo du titulaire"
                      className="h-[330px] w-full object-cover"
                    />
                  ) : (
                    <div className="p-7">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-xs font-black text-white">
                        PHOTO
                      </div>

                      <p className="mt-5 font-extrabold text-black">
                        Ajouter une photo
                      </p>

                      <p className="mt-2 text-sm leading-6 text-neutral-500">
                        Cliquez ici pour sélectionner une photo.
                        <br />
                        Taille maximale : 2 Mo.
                      </p>
                    </div>
                  )}
                </label>

                <input
                  id="photo-personne"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={importerPhoto}
                  className="hidden"
                />

                {formulaire.photo && (
                  <button
                    type="button"
                    onClick={() => modifierChamp("photo", "")}
                    className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                  >
                    Retirer la photo
                  </button>
                )}
              </aside>
            </form>
          </section>
        )}

        {/* Recherche et filtres */}
        <section className="mt-7 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
            <input
              type="search"
              value={recherche}
              onChange={(event) =>
                setRecherche(event.target.value)
              }
              placeholder="Rechercher par nom, téléphone, numéro ou commune..."
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />

            <select
              value={filtreType}
              onChange={(event) =>
                setFiltreType(event.target.value)
              }
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="Tous">Tous les types</option>

              {typesPersonnes.map((typePersonne) => (
                <option
                  key={typePersonne}
                  value={typePersonne}
                >
                  {typePersonne}
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
              <option value="Actif">Actifs</option>
              <option value="En attente">En attente</option>
              <option value="Suspendu">Suspendus</option>
              <option value="Archivé">Archivés</option>
            </select>
          </div>
        </section>

        {/* Liste */}
        <section className="mt-7">
          {personnesFiltrees.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 font-black text-neutral-500">
                PER
              </div>

              <h2 className="mt-5 text-xl font-black text-black">
                Aucune personne enregistrée
              </h2>

              <p className="mx-auto mt-3 max-w-lg leading-7 text-neutral-500">
                Utilisez le bouton « Nouvelle personne » pour commencer
                l’enregistrement.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse text-left">
                  <thead className="bg-neutral-50">
                    <tr className="text-xs uppercase tracking-wider text-neutral-500">
                      <th className="px-5 py-4 font-black">
                        Titulaire
                      </th>
                      <th className="px-5 py-4 font-black">
                        Numéro
                      </th>
                      <th className="px-5 py-4 font-black">
                        Type
                      </th>
                      <th className="px-5 py-4 font-black">
                        Téléphone
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
                    {personnesFiltrees.map((personne) => (
                      <tr
                        key={personne.id}
                        className="border-t border-black/5 transition hover:bg-orange-50/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={personne.photo}
                              alt={personne.nomComplet}
                              className="h-12 w-12 rounded-xl object-cover"
                            />

                            <div>
                              <p className="font-extrabold text-black">
                                {personne.nomComplet}
                              </p>

                              <p className="mt-1 text-xs text-neutral-500">
                                {personne.sexe}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm font-extrabold text-black">
                          {personne.numero}
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600">
                          {personne.typePersonne}
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600">
                          {personne.telephone}
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600">
                          {personne.commune}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold ${obtenirStyleStatut(
                              personne.statut,
                            )}`}
                          >
                            {personne.statut}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPersonneConsultee(personne)
                              }
                              className="rounded-lg bg-black px-3 py-2 text-xs font-extrabold text-white transition hover:bg-green-800"
                            >
                              Consulter
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                modifierPersonne(personne)
                              }
                              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-700 transition hover:bg-orange-100"
                            >
                              Modifier
                            </button>

                            {personne.statut !== "Archivé" && (
                              <button
                                type="button"
                                onClick={() =>
                                  archiverPersonne(personne)
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
      {personneConsultee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="my-8 w-full max-w-3xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-5 bg-black px-6 py-5 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                  Dossier provincial
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {personneConsultee.nomComplet}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setPersonneConsultee(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl transition hover:bg-white/20"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="grid gap-7 p-6 sm:grid-cols-[180px_1fr]">
              <img
                src={personneConsultee.photo}
                alt={personneConsultee.nomComplet}
                className="h-56 w-full rounded-2xl object-cover"
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Information
                  label="Numéro provincial"
                  valeur={personneConsultee.numero}
                />

                <Information
                  label="Type de personne"
                  valeur={personneConsultee.typePersonne}
                />

                <Information
                  label="Sexe"
                  valeur={personneConsultee.sexe}
                />

                <Information
                  label="Date de naissance"
                  valeur={formaterDate(
                    personneConsultee.dateNaissance,
                  )}
                />

                <Information
                  label="Téléphone"
                  valeur={personneConsultee.telephone}
                />

                <Information
                  label="E-mail"
                  valeur={
                    personneConsultee.email || "Non renseigné"
                  }
                />

                <Information
                  label="Commune"
                  valeur={personneConsultee.commune}
                />

                <Information
                  label="Quartier"
                  valeur={personneConsultee.quartier}
                />

                <Information
                  label="Avenue"
                  valeur={
                    personneConsultee.avenue ||
                    "Non renseignée"
                  }
                />

                <Information
                  label="Statut"
                  valeur={personneConsultee.statut}
                />
              </div>
            </div>

            <div className="border-t border-black/10 px-6 py-5">
              <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                Adresse détaillée
              </p>

              <p className="mt-2 leading-7 text-neutral-700">
                {personneConsultee.adresse ||
                  "Aucune précision ajoutée."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    modifierPersonne(personneConsultee)
                  }
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-orange-600"
                >
                  Modifier le dossier
                </button>

                <button
                  type="button"
                  className="rounded-xl bg-black px-5 py-3 text-sm font-extrabold text-white transition hover:bg-green-800"
                >
                  Préparer une carte
                </button>

                {personneConsultee.statut === "En attente" && (
                  <button
                    type="button"
                    onClick={() =>
                      changerStatut(
                        personneConsultee.id,
                        "Actif",
                      )
                    }
                    className="rounded-xl bg-green-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-green-800"
                  >
                    Activer le dossier
                  </button>
                )}

                {personneConsultee.statut === "Actif" && (
                  <button
                    type="button"
                    onClick={() =>
                      changerStatut(
                        personneConsultee.id,
                        "Suspendu",
                      )
                    }
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-red-700"
                  >
                    Suspendre
                  </button>
                )}

                {personneConsultee.statut === "Suspendu" && (
                  <button
                    type="button"
                    onClick={() =>
                      changerStatut(
                        personneConsultee.id,
                        "Actif",
                      )
                    }
                    className="rounded-xl bg-green-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-green-800"
                  >
                    Réactiver
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



