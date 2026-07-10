"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
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

type StatutCompte =
  | "invite"
  | "actif"
  | "suspendu"
  | "desactive";

type Service = {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  actif: boolean;
};

type Employe = {
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
  derniere_connexion: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type ReponseApi = {
  succes: boolean;
  message?: string;
  employes?: Employe[];
  services?: Service[];
  role_connecte?: RoleEmploye;
  employe?: Employe;
};

type FormulaireCreation = {
  nom_complet: string;
  email: string;
  telephone: string;
  mot_de_passe: string;
  service_id: string;
  role: RoleEmploye;
  statut: "invite" | "actif";
  commune: string;
  bureau: string;
};

type FormulaireModification = {
  id: string;
  nom_complet: string;
  email: string;
  telephone: string;
  service_id: string;
  role: RoleEmploye;
  statut: StatutCompte;
  commune: string;
  bureau: string;
};

const CREATION_INITIALE: FormulaireCreation = {
  nom_complet: "",
  email: "",
  telephone: "",
  mot_de_passe: "",
  service_id: "",
  role: "agent_enregistrement",
  statut: "actif",
  commune: "",
  bureau: "",
};

const MODIFICATION_INITIALE: FormulaireModification = {
  id: "",
  nom_complet: "",
  email: "",
  telephone: "",
  service_id: "",
  role: "agent_enregistrement",
  statut: "actif",
  commune: "",
  bureau: "",
};

const ROLES: RoleEmploye[] = [
  "super_admin",
  "admin_provincial",
  "chef_service",
  "agent_enregistrement",
  "agent_cartes",
  "caissier",
  "agent_communication",
  "agent_controle",
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

const LIBELLES_STATUTS: Record<StatutCompte, string> = {
  invite: "En attente",
  actif: "Actif",
  suspendu: "Suspendu",
  desactive: "Désactivé",
};

function formaterDate(date: string | null) {
  if (!date) {
    return "Jamais";
  }

  const objetDate = new Date(date);

  if (Number.isNaN(objetDate.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(objetDate);
}

function obtenirInitiales(nom: string) {
  return nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((partie) => partie.charAt(0).toUpperCase())
    .join("");
}

function genererMotDePasseTemporaire() {
  const minuscules = "abcdefghijkmnopqrstuvwxyz";
  const majuscules = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const chiffres = "23456789";
  const symboles = "!@#$%*-_";
  const tous = minuscules + majuscules + chiffres + symboles;

  function choisir(caracteres: string) {
    const tableau = new Uint32Array(1);
    crypto.getRandomValues(tableau);
    return caracteres[tableau[0] % caracteres.length];
  }

  const resultat = [
    choisir(minuscules),
    choisir(majuscules),
    choisir(chiffres),
    choisir(symboles),
  ];

  while (resultat.length < 16) {
    resultat.push(choisir(tous));
  }

  for (let index = resultat.length - 1; index > 0; index -= 1) {
    const tableau = new Uint32Array(1);
    crypto.getRandomValues(tableau);
    const autreIndex = tableau[0] % (index + 1);

    [resultat[index], resultat[autreIndex]] = [
      resultat[autreIndex],
      resultat[index],
    ];
  }

  return resultat.join("");
}

function messageErreurInconnu() {
  return "Une erreur inattendue est survenue. Veuillez réessayer.";
}

export default function GestionEmployesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [employes, setEmployes] = useState<Employe[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [roleConnecte, setRoleConnecte] =
    useState<RoleEmploye | null>(null);
  const [utilisateurConnecteId, setUtilisateurConnecteId] =
    useState<string | null>(null);

  const [creation, setCreation] =
    useState<FormulaireCreation>(CREATION_INITIALE);
  const [modification, setModification] =
    useState<FormulaireModification>(MODIFICATION_INITIALE);

  const [recherche, setRecherche] = useState("");
  const [filtreService, setFiltreService] = useState("tous");
  const [filtreStatut, setFiltreStatut] = useState("tous");

  const [chargement, setChargement] = useState(true);
  const [actionEnCours, setActionEnCours] =
    useState<string | null>(null);
  const [creationOuverte, setCreationOuverte] = useState(false);
  const [modificationOuverte, setModificationOuverte] =
    useState(false);
  const [afficherMotDePasse, setAfficherMotDePasse] =
    useState(false);

  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  const chargerEmployes = useCallback(async () => {
    setChargement(true);
    setErreur("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUtilisateurConnecteId(user?.id || null);

      const reponse = await fetch("/api/admin/employes", {
        method: "GET",
        cache: "no-store",
      });

      const donnees = (await reponse.json()) as ReponseApi;

      if (reponse.status === 401) {
        router.replace("/admin/login");
        router.refresh();
        return;
      }

      if (!reponse.ok || !donnees.succes) {
        setErreur(
          donnees.message || "Impossible de charger les employés.",
        );
        return;
      }

      setEmployes(donnees.employes || []);
      setServices(
        (donnees.services || []).filter((service) => service.actif),
      );
      setRoleConnecte(donnees.role_connecte || null);
    } catch {
      setErreur(
        "Le serveur ne répond pas. Vérifiez que le projet est démarré.",
      );
    } finally {
      setChargement(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void chargerEmployes();
  }, [chargerEmployes]);

  const servicesParId = useMemo(() => {
    return new Map(
      services.map((service) => [service.id, service]),
    );
  }, [services]);

  const rolesAutorisables = useMemo(() => {
    if (roleConnecte === "super_admin") {
      return ROLES;
    }

    return ROLES.filter(
      (role) =>
        role !== "super_admin" &&
        role !== "admin_provincial",
    );
  }, [roleConnecte]);

  const employesFiltres = useMemo(() => {
    const texte = recherche.trim().toLowerCase();

    return employes.filter((employe) => {
      const service = employe.service_id
        ? servicesParId.get(employe.service_id)
        : null;

      const correspondRecherche =
        !texte ||
        employe.nom_complet.toLowerCase().includes(texte) ||
        employe.email.toLowerCase().includes(texte) ||
        (employe.matricule || "").toLowerCase().includes(texte) ||
        (employe.telephone || "").toLowerCase().includes(texte) ||
        (service?.nom || "").toLowerCase().includes(texte);

      const correspondService =
        filtreService === "tous" ||
        employe.service_id === filtreService;

      const correspondStatut =
        filtreStatut === "tous" ||
        employe.statut === filtreStatut;

      return (
        correspondRecherche &&
        correspondService &&
        correspondStatut
      );
    });
  }, [
    employes,
    filtreService,
    filtreStatut,
    recherche,
    servicesParId,
  ]);

  const statistiques = useMemo(() => {
    return {
      total: employes.length,
      actifs: employes.filter(
        (employe) => employe.statut === "actif",
      ).length,
      attente: employes.filter(
        (employe) => employe.statut === "invite",
      ).length,
      bloques: employes.filter(
        (employe) =>
          employe.statut === "suspendu" ||
          employe.statut === "desactive",
      ).length,
    };
  }, [employes]);

  function fermerMessages() {
    setErreur("");
    setSucces("");
  }

  async function lireReponse(reponse: Response) {
    try {
      return (await reponse.json()) as ReponseApi;
    } catch {
      return {
        succes: false,
        message: messageErreurInconnu(),
      } satisfies ReponseApi;
    }
  }

  async function creerEmploye(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    fermerMessages();

    if (creation.nom_complet.trim().length < 3) {
      setErreur("Saisissez le nom complet de l’employé.");
      return;
    }

    if (!creation.email.trim()) {
      setErreur("Saisissez l’adresse e-mail de l’employé.");
      return;
    }

    if (creation.mot_de_passe.length < 10) {
      setErreur(
        "Le mot de passe temporaire doit contenir au moins 10 caractères.",
      );
      return;
    }

    if (!creation.service_id) {
      setErreur("Sélectionnez le service de l’employé.");
      return;
    }

    setActionEnCours("creation");

    try {
      const reponse = await fetch("/api/admin/employes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(creation),
      });

      const donnees = await lireReponse(reponse);

      if (!reponse.ok || !donnees.succes) {
        setErreur(
          donnees.message || "Impossible de créer le compte.",
        );
        return;
      }

      setSucces(
        donnees.message || "Le compte employé a été créé.",
      );
      setCreation(CREATION_INITIALE);
      setCreationOuverte(false);
      setAfficherMotDePasse(false);

      await chargerEmployes();
    } catch {
      setErreur("Une erreur réseau empêche la création du compte.");
    } finally {
      setActionEnCours(null);
    }
  }

  function ouvrirModification(employe: Employe) {
    setModification({
      id: employe.id,
      nom_complet: employe.nom_complet,
      email: employe.email,
      telephone: employe.telephone || "",
      service_id: employe.service_id || "",
      role: employe.role,
      statut: employe.statut,
      commune: employe.commune || "",
      bureau: employe.bureau || "",
    });

    fermerMessages();
    setModificationOuverte(true);
  }

  async function modifierEmploye(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    fermerMessages();

    if (!modification.id) {
      setErreur("Aucun employé n’a été sélectionné.");
      return;
    }

    if (modification.nom_complet.trim().length < 3) {
      setErreur("Le nom complet est obligatoire.");
      return;
    }

    if (!modification.service_id) {
      setErreur("Sélectionnez un service.");
      return;
    }

    setActionEnCours(`modifier-${modification.id}`);

    try {
      const reponse = await fetch(
        `/api/admin/employes/${modification.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nom_complet: modification.nom_complet,
            telephone: modification.telephone,
            service_id: modification.service_id,
            role: modification.role,
            statut: modification.statut,
            commune: modification.commune,
            bureau: modification.bureau,
          }),
        },
      );

      const donnees = await lireReponse(reponse);

      if (!reponse.ok || !donnees.succes) {
        setErreur(
          donnees.message || "Impossible de modifier le compte.",
        );
        return;
      }

      setSucces(
        donnees.message || "Le compte a été modifié.",
      );
      setModificationOuverte(false);
      setModification(MODIFICATION_INITIALE);

      await chargerEmployes();
    } catch {
      setErreur("Une erreur réseau empêche la modification.");
    } finally {
      setActionEnCours(null);
    }
  }

  async function changerStatut(employe: Employe) {
    fermerMessages();

    const nouveauStatut: StatutCompte =
      employe.statut === "actif" ? "suspendu" : "actif";

    const action =
      nouveauStatut === "suspendu"
        ? "suspendre"
        : "réactiver";

    const confirmation = window.confirm(
      `Voulez-vous ${action} le compte de ${employe.nom_complet} ?`,
    );

    if (!confirmation) {
      return;
    }

    if (!employe.service_id) {
      setErreur(
        "Ce compte n’a pas de service. Utilisez Modifier avant de changer son statut.",
      );
      return;
    }

    setActionEnCours(`statut-${employe.id}`);

    try {
      const reponse = await fetch(
        `/api/admin/employes/${employe.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nom_complet: employe.nom_complet,
            telephone: employe.telephone || "",
            service_id: employe.service_id,
            role: employe.role,
            statut: nouveauStatut,
            commune: employe.commune || "",
            bureau: employe.bureau || "",
          }),
        },
      );

      const donnees = await lireReponse(reponse);

      if (!reponse.ok || !donnees.succes) {
        setErreur(
          donnees.message ||
            "Impossible de modifier le statut du compte.",
        );
        return;
      }

      setSucces(
        nouveauStatut === "suspendu"
          ? "Le compte employé a été suspendu."
          : "Le compte employé a été réactivé.",
      );

      await chargerEmployes();
    } catch {
      setErreur("Une erreur réseau empêche cette opération.");
    } finally {
      setActionEnCours(null);
    }
  }

  async function supprimerEmploye(employe: Employe) {
    fermerMessages();

    const confirmation = window.confirm(
      `ATTENTION : supprimer définitivement le compte de ${employe.nom_complet} ?\n\nCette action supprimera aussi ses identifiants de connexion.`,
    );

    if (!confirmation) {
      return;
    }

    const confirmationFinale = window.prompt(
      `Pour confirmer, écrivez exactement : SUPPRIMER`,
    );

    if (confirmationFinale !== "SUPPRIMER") {
      setErreur("Suppression annulée : confirmation incorrecte.");
      return;
    }

    setActionEnCours(`supprimer-${employe.id}`);

    try {
      const reponse = await fetch(
        `/api/admin/employes/${employe.id}`,
        {
          method: "DELETE",
        },
      );

      const donnees = await lireReponse(reponse);

      if (!reponse.ok || !donnees.succes) {
        setErreur(
          donnees.message || "Impossible de supprimer le compte.",
        );
        return;
      }

      setSucces(
        donnees.message || "Le compte a été supprimé.",
      );

      await chargerEmployes();
    } catch {
      setErreur("Une erreur réseau empêche la suppression.");
    } finally {
      setActionEnCours(null);
    }
  }

  async function copierMotDePasse() {
    if (!creation.mot_de_passe) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        creation.mot_de_passe,
      );
      setSucces("Mot de passe temporaire copié.");
    } catch {
      setErreur("Impossible de copier le mot de passe.");
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-xs font-black text-white transition hover:bg-orange-500"
            >
              PC
            </Link>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                Administration
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                Gestion des employés
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-5 text-sm font-extrabold transition hover:bg-neutral-100"
            >
              ← Tableau de bord
            </Link>

            <button
              type="button"
              onClick={() => {
                fermerMessages();
                setCreationOuverte((ancienne) => !ancienne);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-extrabold text-white transition hover:bg-orange-600"
            >
              {creationOuverte
                ? "Fermer le formulaire"
                : "+ Nouvel employé"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
        {erreur && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold leading-6 text-red-800"
          >
            {erreur}
          </div>
        )}

        {succes && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 font-bold leading-6 text-green-800">
            {succes}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CarteStatistique
            titre="Tous les employés"
            valeur={statistiques.total}
            description="Comptes enregistrés"
            code="TOT"
          />

          <CarteStatistique
            titre="Comptes actifs"
            valeur={statistiques.actifs}
            description="Accès autorisé"
            code="ACT"
          />

          <CarteStatistique
            titre="En attente"
            valeur={statistiques.attente}
            description="Activation nécessaire"
            code="INV"
          />

          <CarteStatistique
            titre="Accès bloqués"
            valeur={statistiques.bloques}
            description="Suspendus ou désactivés"
            code="BLQ"
          />
        </section>

        {creationOuverte && (
          <section className="mt-7 overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-xl shadow-black/5">
            <div className="bg-neutral-950 px-5 py-5 text-white sm:px-7">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-400">
                Nouveau compte
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Enregistrer un employé
              </h2>
            </div>

            <form
              onSubmit={creerEmploye}
              className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7 xl:grid-cols-3"
            >
              <Champ
                label="Nom complet"
                valeur={creation.nom_complet}
                obligatoire
                onChange={(valeur) =>
                  setCreation((ancien) => ({
                    ...ancien,
                    nom_complet: valeur,
                  }))
                }
              />

              <Champ
                label="Adresse e-mail"
                type="email"
                valeur={creation.email}
                obligatoire
                onChange={(valeur) =>
                  setCreation((ancien) => ({
                    ...ancien,
                    email: valeur,
                  }))
                }
              />

              <Champ
                label="Téléphone"
                type="tel"
                valeur={creation.telephone}
                onChange={(valeur) =>
                  setCreation((ancien) => ({
                    ...ancien,
                    telephone: valeur,
                  }))
                }
              />

              <SelectionService
                services={services}
                valeur={creation.service_id}
                onChange={(valeur) =>
                  setCreation((ancien) => ({
                    ...ancien,
                    service_id: valeur,
                  }))
                }
              />

              <SelectionRole
                roles={rolesAutorisables}
                valeur={creation.role}
                onChange={(valeur) =>
                  setCreation((ancien) => ({
                    ...ancien,
                    role: valeur,
                  }))
                }
              />

              <div>
                <label className="mb-2 block text-sm font-extrabold">
                  Statut initial *
                </label>

                <select
                  value={creation.statut}
                  onChange={(event) =>
                    setCreation((ancien) => ({
                      ...ancien,
                      statut: event.target.value as
                        | "invite"
                        | "actif",
                    }))
                  }
                  className="min-h-12 w-full rounded-2xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500"
                >
                  <option value="actif">
                    Actif immédiatement
                  </option>
                  <option value="invite">
                    En attente d’activation
                  </option>
                </select>
              </div>

              <Champ
                label="Commune"
                valeur={creation.commune}
                onChange={(valeur) =>
                  setCreation((ancien) => ({
                    ...ancien,
                    commune: valeur,
                  }))
                }
              />

              <Champ
                label="Bureau"
                valeur={creation.bureau}
                onChange={(valeur) =>
                  setCreation((ancien) => ({
                    ...ancien,
                    bureau: valeur,
                  }))
                }
              />

              <div>
                <label className="mb-2 block text-sm font-extrabold">
                  Mot de passe temporaire *
                </label>

                <div className="relative">
                  <input
                    type={
                      afficherMotDePasse
                        ? "text"
                        : "password"
                    }
                    value={creation.mot_de_passe}
                    onChange={(event) =>
                      setCreation((ancien) => ({
                        ...ancien,
                        mot_de_passe: event.target.value,
                      }))
                    }
                    minLength={10}
                    required
                    className="min-h-12 w-full rounded-2xl border border-black/15 bg-neutral-50 px-4 pr-24 outline-none focus:border-orange-500"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setAfficherMotDePasse((ancien) => !ancien)
                    }
                    className="absolute inset-y-2 right-2 rounded-xl px-3 text-xs font-extrabold hover:bg-neutral-200"
                  >
                    {afficherMotDePasse ? "Masquer" : "Afficher"}
                  </button>
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCreation((ancien) => ({
                        ...ancien,
                        mot_de_passe:
                          genererMotDePasseTemporaire(),
                      }))
                    }
                    className="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-extrabold hover:bg-neutral-200"
                  >
                    Générer
                  </button>

                  <button
                    type="button"
                    onClick={copierMotDePasse}
                    disabled={!creation.mot_de_passe}
                    className="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-extrabold hover:bg-neutral-200 disabled:opacity-50"
                  >
                    Copier
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2 xl:col-span-3">
                <button
                  type="submit"
                  disabled={actionEnCours === "creation"}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-green-700 px-6 font-extrabold text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {actionEnCours === "creation"
                    ? "Création en cours..."
                    : "Créer le compte"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="mt-7 rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                Personnel autorisé
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Liste des employés
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                {employesFiltres.length} résultat(s)
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:w-[780px]">
              <input
                type="search"
                value={recherche}
                onChange={(event) =>
                  setRecherche(event.target.value)
                }
                placeholder="Nom, e-mail, matricule..."
                className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500"
              />

              <select
                value={filtreService}
                onChange={(event) =>
                  setFiltreService(event.target.value)
                }
                className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500"
              >
                <option value="tous">
                  Tous les services
                </option>

                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.nom}
                  </option>
                ))}
              </select>

              <select
                value={filtreStatut}
                onChange={(event) =>
                  setFiltreStatut(event.target.value)
                }
                className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500"
              >
                <option value="tous">
                  Tous les statuts
                </option>
                <option value="actif">Actifs</option>
                <option value="invite">En attente</option>
                <option value="suspendu">Suspendus</option>
                <option value="desactive">Désactivés</option>
              </select>
            </div>
          </div>

          {chargement ? (
            <div className="mt-7 rounded-2xl bg-neutral-100 p-10 text-center font-bold text-neutral-600">
              Chargement des employés...
            </div>
          ) : employesFiltres.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-dashed border-black/20 p-10 text-center">
              <p className="font-black">
                Aucun employé trouvé
              </p>
            </div>
          ) : (
            <div className="mt-7 overflow-x-auto">
              <table className="w-full min-w-[1250px] border-collapse">
                <thead>
                  <tr className="border-b border-black/10 text-left text-xs font-black uppercase tracking-[0.1em] text-neutral-500">
                    <th className="px-3 py-4">Employé</th>
                    <th className="px-3 py-4">Matricule</th>
                    <th className="px-3 py-4">Service</th>
                    <th className="px-3 py-4">Rôle</th>
                    <th className="px-3 py-4">Statut</th>
                    <th className="px-3 py-4">Dernière connexion</th>
                    <th className="px-3 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {employesFiltres.map((employe) => {
                    const service = employe.service_id
                      ? servicesParId.get(employe.service_id)
                      : null;

                    const estCompteConnecte =
                      employe.id === utilisateurConnecteId;

                    return (
                      <tr
                        key={employe.id}
                        className="border-b border-black/5 align-top hover:bg-neutral-50"
                      >
                        <td className="px-3 py-5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-xs font-black text-white">
                              {obtenirInitiales(
                                employe.nom_complet,
                              )}
                            </div>

                            <div>
                              <p className="font-black">
                                {employe.nom_complet}
                                {estCompteConnecte && (
                                  <span className="ml-2 rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black text-orange-700">
                                    VOUS
                                  </span>
                                )}
                              </p>

                              <p className="mt-1 text-sm text-neutral-500">
                                {employe.email}
                              </p>

                              {employe.telephone && (
                                <p className="mt-1 text-xs text-neutral-500">
                                  {employe.telephone}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-5">
                          <span className="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-black">
                            {employe.matricule || "Non attribué"}
                          </span>
                        </td>

                        <td className="px-3 py-5">
                          <p className="font-bold">
                            {service?.nom || "Non affecté"}
                          </p>
                          <p className="mt-1 text-xs font-black text-orange-600">
                            {service?.code || "—"}
                          </p>
                        </td>

                        <td className="px-3 py-5 text-sm font-bold">
                          {LIBELLES_ROLES[employe.role]}
                        </td>

                        <td className="px-3 py-5">
                          <BadgeStatut statut={employe.statut} />
                        </td>

                        <td className="px-3 py-5 text-sm text-neutral-600">
                          {formaterDate(employe.derniere_connexion)}
                        </td>

                        <td className="px-3 py-5">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                ouvrirModification(employe)
                              }
                              className="rounded-lg bg-neutral-950 px-3 py-2 text-xs font-extrabold text-white hover:bg-orange-500"
                            >
                              Modifier
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void changerStatut(employe)
                              }
                              disabled={
                                estCompteConnecte ||
                                actionEnCours ===
                                  `statut-${employe.id}`
                              }
                              className="rounded-lg bg-orange-100 px-3 py-2 text-xs font-extrabold text-orange-800 hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {actionEnCours ===
                              `statut-${employe.id}`
                                ? "Traitement..."
                                : employe.statut === "actif"
                                  ? "Suspendre"
                                  : "Réactiver"}
                            </button>

                            {roleConnecte === "super_admin" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void supprimerEmploye(employe)
                                }
                                disabled={
                                  estCompteConnecte ||
                                  actionEnCours ===
                                    `supprimer-${employe.id}`
                                }
                                className="rounded-lg bg-red-100 px-3 py-2 text-xs font-extrabold text-red-800 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {actionEnCours ===
                                `supprimer-${employe.id}`
                                  ? "Suppression..."
                                  : "Supprimer"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {modificationOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-5 border-b border-black/10 bg-neutral-950 p-6 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-400">
                  Modification
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Modifier le compte employé
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setModificationOuverte(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={modifierEmploye}
              className="grid gap-5 p-6 sm:grid-cols-2"
            >
              <Champ
                label="Nom complet"
                valeur={modification.nom_complet}
                obligatoire
                onChange={(valeur) =>
                  setModification((ancien) => ({
                    ...ancien,
                    nom_complet: valeur,
                  }))
                }
              />

              <div>
                <label className="mb-2 block text-sm font-extrabold">
                  Adresse e-mail
                </label>

                <input
                  type="email"
                  value={modification.email}
                  disabled
                  className="min-h-12 w-full rounded-2xl border border-black/10 bg-neutral-200 px-4 text-neutral-500"
                />

                <p className="mt-1 text-xs text-neutral-500">
                  La modification d’e-mail sera ajoutée séparément.
                </p>
              </div>

              <Champ
                label="Téléphone"
                type="tel"
                valeur={modification.telephone}
                onChange={(valeur) =>
                  setModification((ancien) => ({
                    ...ancien,
                    telephone: valeur,
                  }))
                }
              />

              <SelectionService
                services={services}
                valeur={modification.service_id}
                onChange={(valeur) =>
                  setModification((ancien) => ({
                    ...ancien,
                    service_id: valeur,
                  }))
                }
              />

              <SelectionRole
                roles={rolesAutorisables}
                valeur={modification.role}
                onChange={(valeur) =>
                  setModification((ancien) => ({
                    ...ancien,
                    role: valeur,
                  }))
                }
              />

              <div>
                <label className="mb-2 block text-sm font-extrabold">
                  Statut *
                </label>

                <select
                  value={modification.statut}
                  onChange={(event) =>
                    setModification((ancien) => ({
                      ...ancien,
                      statut: event.target.value as StatutCompte,
                    }))
                  }
                  className="min-h-12 w-full rounded-2xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500"
                >
                  <option value="invite">En attente</option>
                  <option value="actif">Actif</option>
                  <option value="suspendu">Suspendu</option>
                  <option value="desactive">Désactivé</option>
                </select>
              </div>

              <Champ
                label="Commune"
                valeur={modification.commune}
                onChange={(valeur) =>
                  setModification((ancien) => ({
                    ...ancien,
                    commune: valeur,
                  }))
                }
              />

              <Champ
                label="Bureau"
                valeur={modification.bureau}
                onChange={(valeur) =>
                  setModification((ancien) => ({
                    ...ancien,
                    bureau: valeur,
                  }))
                }
              />

              <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setModificationOuverte(false)}
                  className="min-h-12 rounded-xl border border-black/10 px-5 font-extrabold hover:bg-neutral-100"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={
                    actionEnCours ===
                    `modifier-${modification.id}`
                  }
                  className="min-h-12 rounded-xl bg-orange-500 px-6 font-extrabold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {actionEnCours ===
                  `modifier-${modification.id}`
                    ? "Enregistrement..."
                    : "Enregistrer les modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

type ChampProps = {
  label: string;
  valeur: string;
  type?: "text" | "email" | "tel";
  obligatoire?: boolean;
  onChange: (valeur: string) => void;
};

function Champ({
  label,
  valeur,
  type = "text",
  obligatoire = false,
  onChange,
}: ChampProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-extrabold">
        {label}
        {obligatoire ? " *" : ""}
      </label>

      <input
        type={type}
        value={valeur}
        required={obligatoire}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-2xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500"
      />
    </div>
  );
}

function SelectionService({
  services,
  valeur,
  onChange,
}: {
  services: Service[];
  valeur: string;
  onChange: (valeur: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-extrabold">
        Service *
      </label>

      <select
        value={valeur}
        required
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-2xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500"
      >
        <option value="">Sélectionner un service</option>

        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.code} — {service.nom}
          </option>
        ))}
      </select>
    </div>
  );
}

function SelectionRole({
  roles,
  valeur,
  onChange,
}: {
  roles: RoleEmploye[];
  valeur: RoleEmploye;
  onChange: (valeur: RoleEmploye) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-extrabold">
        Rôle *
      </label>

      <select
        value={valeur}
        required
        onChange={(event) =>
          onChange(event.target.value as RoleEmploye)
        }
        className="min-h-12 w-full rounded-2xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500"
      >
        {roles.map((role) => (
          <option key={role} value={role}>
            {LIBELLES_ROLES[role]}
          </option>
        ))}
      </select>
    </div>
  );
}

function CarteStatistique({
  titre,
  valeur,
  description,
  code,
}: {
  titre: string;
  valeur: number;
  description: string;
  code: string;
}) {
  return (
    <article className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-neutral-500">
            {titre}
          </p>

          <p className="mt-3 text-4xl font-black">
            {valeur}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-[10px] font-black text-orange-400">
          {code}
        </div>
      </div>

      <p className="mt-4 text-sm text-neutral-500">
        {description}
      </p>
    </article>
  );
}

function BadgeStatut({
  statut,
}: {
  statut: StatutCompte;
}) {
  const classes: Record<StatutCompte, string> = {
    actif: "border-green-200 bg-green-50 text-green-800",
    invite: "border-orange-200 bg-orange-50 text-orange-800",
    suspendu: "border-red-200 bg-red-50 text-red-800",
    desactive:
      "border-neutral-300 bg-neutral-100 text-neutral-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${classes[statut]}`}
    >
      {LIBELLES_STATUTS[statut]}
    </span>
  );
}
