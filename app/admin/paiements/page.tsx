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

type StatutPaiement =
  | "Payé"
  | "Partiel"
  | "Annulé"
  | "Remboursé";

type Personne = {
  id: string;
  numero: string;
  nomComplet: string;
  telephone: string;
  commune: string;
  quartier: string;
  statut: string;
};

type Activite = {
  id: string;
  numero: string;
  nomActivite: string;
  typeActivite: string;
  responsableId: string;
  responsableNom: string;
  commune: string;
  statut: string;
};

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
  statut: string;
};

type PaiementProvincial = {
  id: string;
  numero: string;

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
  devise: Devise;

  modePaiement: string;
  referenceTransaction: string;
  datePaiement: string;
  periodeConcernee: string;

  agentEncaisseur: string;
  bureauEncaissement: string;
  observations: string;

  statut: StatutPaiement;

  createdAt: string;
  updatedAt: string;
};

type FormulairePaiement = {
  personneId: string;
  activiteId: string;
  taxeId: string;

  montantDu: string;
  montantPaye: string;
  devise: Devise;

  modePaiement: string;
  referenceTransaction: string;
  datePaiement: string;
  periodeConcernee: string;

  agentEncaisseur: string;
  bureauEncaissement: string;
  observations: string;
};

const CLE_PERSONNES = "province-connect-personnes";
const CLE_ACTIVITES = "province-connect-activites";
const CLE_TAXES = "province-connect-taxes";
const CLE_PAIEMENTS = "province-connect-paiements";

const modesPaiement = [
  "Espèces",
  "Mobile Money",
  "Virement bancaire",
  "Carte bancaire",
  "Chèque",
  "Autre",
];

const bureauxEncaissement = [
  "Bureau provincial central",
  "Guichet communal d’Ibanda",
  "Guichet communal de Kadutu",
  "Guichet communal de Bagira",
  "Guichet mobile",
  "Autre bureau",
];

function obtenirDateAujourdhui() {
  const date = new Date();
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");

  return `${annee}-${mois}-${jour}`;
}

function creerFormulaireInitial(): FormulairePaiement {
  return {
    personneId: "",
    activiteId: "",
    taxeId: "",

    montantDu: "",
    montantPaye: "",
    devise: "CDF",

    modePaiement: "Espèces",
    referenceTransaction: "",
    datePaiement: obtenirDateAujourdhui(),
    periodeConcernee: "",

    agentEncaisseur: "Agent provincial",
    bureauEncaissement: "Bureau provincial central",
    observations: "",
  };
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

function calculerStatutPaiement(
  montantDu: number,
  montantPaye: number,
): StatutPaiement {
  if (montantPaye >= montantDu) {
    return "Payé";
  }

  return "Partiel";
}

function taxeExigeActivite(taxe: TaxeProvinciale | null) {
  if (!taxe) {
    return false;
  }

  const cible = taxe.cible.toLowerCase();

  return (
    cible.includes("activité") ||
    cible.includes("entreprise") ||
    cible.includes("association") ||
    cible.includes("structure")
  );
}

export default function AdminPaiementsPage() {
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [taxes, setTaxes] = useState<TaxeProvinciale[]>([]);
  const [paiements, setPaiements] = useState<
    PaiementProvincial[]
  >([]);


  const [formulaire, setFormulaire] =
    useState<FormulairePaiement>(creerFormulaireInitial);

  const [formulaireVisible, setFormulaireVisible] =
    useState(false);

  const [paiementEnModification, setPaiementEnModification] =
    useState<string | null>(null);

  const [paiementConsulte, setPaiementConsulte] =
    useState<PaiementProvincial | null>(null);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [filtreDevise, setFiltreDevise] = useState("Toutes");
  const [filtreMode, setFiltreMode] = useState("Tous");

  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  useSupabaseCollection({
    table: "personnes",
    items: personnes,
    setItems: setPersonnes,
    readOnly: true,
    onError: setErreur,
  });

  useSupabaseCollection({
    table: "activites",
    items: activites,
    setItems: setActivites,
    readOnly: true,
    onError: setErreur,
  });

  useSupabaseCollection({
    table: "taxes",
    items: taxes,
    setItems: setTaxes,
    readOnly: true,
    onError: setErreur,
  });

  useSupabaseCollection({
    table: "paiements",
    items: paiements,
    setItems: setPaiements,
    localStorageKey: CLE_PAIEMENTS,
    onError: setErreur,
  });

  const personnesDisponibles = useMemo(() => {
    return personnes
      .filter(
        (personne) =>
          personne.statut !== "Archivé" &&
          personne.statut !== "Suspendu",
      )
      .sort((premiere, deuxieme) =>
        premiere.nomComplet.localeCompare(
          deuxieme.nomComplet,
          "fr",
        ),
      );
  }, [personnes]);

  const taxesActives = useMemo(() => {
    const aujourdHui = obtenirDateAujourdhui();

    return taxes
      .filter((taxe) => {
        const dateDebutValide =
          !taxe.dateDebut || taxe.dateDebut <= aujourdHui;

        const dateFinValide =
          !taxe.dateFin || taxe.dateFin >= aujourdHui;

        return (
          taxe.statut === "Actif" &&
          dateDebutValide &&
          dateFinValide
        );
      })
      .sort((premiere, deuxieme) =>
        premiere.nom.localeCompare(deuxieme.nom, "fr"),
      );
  }, [taxes]);

  const personneSelectionnee = useMemo(() => {
    return (
      personnes.find(
        (personne) =>
          personne.id === formulaire.personneId,
      ) || null
    );
  }, [personnes, formulaire.personneId]);

  const taxeSelectionnee = useMemo(() => {
    return (
      taxes.find(
        (taxe) => taxe.id === formulaire.taxeId,
      ) || null
    );
  }, [taxes, formulaire.taxeId]);

  const activiteSelectionnee = useMemo(() => {
    return (
      activites.find(
        (activite) =>
          activite.id === formulaire.activiteId,
      ) || null
    );
  }, [activites, formulaire.activiteId]);

  const activitesDeLaPersonne = useMemo(() => {
    if (!formulaire.personneId) {
      return [];
    }

    return activites.filter(
      (activite) =>
        activite.responsableId === formulaire.personneId &&
        activite.statut !== "Fermé" &&
        activite.statut !== "Refusé",
    );
  }, [activites, formulaire.personneId]);

  const montantDuApercu =
    Number(formulaire.montantDu) || 0;

  const montantPayeApercu =
    Number(formulaire.montantPaye) || 0;

  const resteAPayerApercu = Math.max(
    montantDuApercu - montantPayeApercu,
    0,
  );

  const statutApercu =
    montantDuApercu > 0 && montantPayeApercu > 0
      ? calculerStatutPaiement(
          montantDuApercu,
          montantPayeApercu,
        )
      : "Partiel";

  const statistiques = useMemo(() => {
    const paiementsValables = paiements.filter(
      (paiement) =>
        paiement.statut !== "Annulé" &&
        paiement.statut !== "Remboursé",
    );

    return {
      total: paiements.length,

      payes: paiements.filter(
        (paiement) => paiement.statut === "Payé",
      ).length,

      partiels: paiements.filter(
        (paiement) => paiement.statut === "Partiel",
      ).length,

      totalCDF: paiementsValables
        .filter((paiement) => paiement.devise === "CDF")
        .reduce(
          (total, paiement) =>
            total + paiement.montantPaye,
          0,
        ),

      totalUSD: paiementsValables
        .filter((paiement) => paiement.devise === "USD")
        .reduce(
          (total, paiement) =>
            total + paiement.montantPaye,
          0,
        ),
    };
  }, [paiements]);

  const paiementsFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return paiements.filter((paiement) => {
      const correspondRecherche =
        !terme ||
        paiement.numero.toLowerCase().includes(terme) ||
        paiement.payeurNom.toLowerCase().includes(terme) ||
        paiement.payeurNumero.toLowerCase().includes(terme) ||
        paiement.taxeNom.toLowerCase().includes(terme) ||
        paiement.activiteNom.toLowerCase().includes(terme) ||
        paiement.referenceTransaction
          .toLowerCase()
          .includes(terme);

      const correspondStatut =
        filtreStatut === "Tous" ||
        paiement.statut === filtreStatut;

      const correspondDevise =
        filtreDevise === "Toutes" ||
        paiement.devise === filtreDevise;

      const correspondMode =
        filtreMode === "Tous" ||
        paiement.modePaiement === filtreMode;

      return (
        correspondRecherche &&
        correspondStatut &&
        correspondDevise &&
        correspondMode
      );
    });
  }, [
    paiements,
    recherche,
    filtreStatut,
    filtreDevise,
    filtreMode,
  ]);

  function modifierChamp<
    K extends keyof FormulairePaiement,
  >(
    champ: K,
    valeur: FormulairePaiement[K],
  ) {
    setFormulaire((ancienFormulaire) => ({
      ...ancienFormulaire,
      [champ]: valeur,
    }));

    setErreur("");
    setMessage("");
  }

  function choisirPersonne(personneId: string) {
    setFormulaire((ancienFormulaire) => ({
      ...ancienFormulaire,
      personneId,
      activiteId: "",
    }));

    setErreur("");
    setMessage("");
  }

  function choisirTaxe(taxeId: string) {
    const taxe =
      taxes.find((element) => element.id === taxeId) ||
      null;

    setFormulaire((ancienFormulaire) => ({
      ...ancienFormulaire,
      taxeId,
      montantDu: taxe ? String(taxe.montant) : "",
      montantPaye: taxe ? String(taxe.montant) : "",
      devise: taxe?.devise || "CDF",
      activiteId:
        taxe && taxeExigeActivite(taxe)
          ? ancienFormulaire.activiteId
          : ancienFormulaire.activiteId,
    }));

    setErreur("");
    setMessage("");
  }

  function genererNumeroPaiement() {
    const annee = new Date().getFullYear();

    const plusGrandNumero = paiements.reduce(
      (maximum, paiement) => {
        const dernierePartie =
          paiement.numero.split("-").pop();

        const numero = Number(dernierePartie);

        return Number.isFinite(numero)
          ? Math.max(maximum, numero)
          : maximum;
      },
      0,
    );

    return `PC-PAY-${annee}-${String(
      plusGrandNumero + 1,
    ).padStart(6, "0")}`;
  }

  function verifierFormulaire() {
    if (!formulaire.personneId) {
      return "Veuillez sélectionner la personne qui effectue le paiement.";
    }

    if (!formulaire.taxeId) {
      return "Veuillez sélectionner une taxe active.";
    }

    if (
      taxeExigeActivite(taxeSelectionnee) &&
      !formulaire.activiteId
    ) {
      return "Une activité doit être sélectionnée pour cette taxe.";
    }

    const montantDu = Number(formulaire.montantDu);
    const montantPaye = Number(formulaire.montantPaye);

    if (
      !Number.isFinite(montantDu) ||
      montantDu <= 0
    ) {
      return "Le montant dû doit être supérieur à zéro.";
    }

    if (
      !Number.isFinite(montantPaye) ||
      montantPaye <= 0
    ) {
      return "Le montant payé doit être supérieur à zéro.";
    }

    if (montantPaye > montantDu) {
      return "Le montant payé ne peut pas dépasser le montant dû.";
    }

    if (!formulaire.datePaiement) {
      return "La date du paiement est obligatoire.";
    }

    if (!formulaire.agentEncaisseur.trim()) {
      return "Le nom de l’agent encaisseur est obligatoire.";
    }

    if (!formulaire.bureauEncaissement.trim()) {
      return "Le bureau d’encaissement est obligatoire.";
    }

    if (
      formulaire.modePaiement !== "Espèces" &&
      !formulaire.referenceTransaction.trim()
    ) {
      return "La référence de transaction est obligatoire pour ce mode de paiement.";
    }

    return "";
  }

  function enregistrerPaiement(
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

    if (!personneSelectionnee || !taxeSelectionnee) {
      setErreur(
        "La personne ou la taxe sélectionnée est introuvable.",
      );
      return;
    }

    const montantDu = Number(formulaire.montantDu);
    const montantPaye = Number(formulaire.montantPaye);

    const statut = calculerStatutPaiement(
      montantDu,
      montantPaye,
    );

    const maintenant = new Date().toISOString();

    if (paiementEnModification) {
      setPaiements((anciensPaiements) =>
        anciensPaiements.map((paiement) =>
          paiement.id === paiementEnModification
            ? {
                ...paiement,

                personneId: formulaire.personneId,
                payeurNom:
                  personneSelectionnee.nomComplet,
                payeurNumero:
                  personneSelectionnee.numero,

                activiteId: formulaire.activiteId,
                activiteNom:
                  activiteSelectionnee?.nomActivite || "",
                activiteNumero:
                  activiteSelectionnee?.numero || "",

                taxeId: taxeSelectionnee.id,
                taxeNumero: taxeSelectionnee.numero,
                taxeNom: taxeSelectionnee.nom,
                taxeCategorie:
                  taxeSelectionnee.categorie,
                taxeFrequence:
                  taxeSelectionnee.frequence,

                montantDu,
                montantPaye,
                devise: formulaire.devise,

                modePaiement:
                  formulaire.modePaiement,

                referenceTransaction:
                  formulaire.referenceTransaction.trim(),

                datePaiement:
                  formulaire.datePaiement,

                periodeConcernee:
                  formulaire.periodeConcernee.trim(),

                agentEncaisseur:
                  formulaire.agentEncaisseur.trim(),

                bureauEncaissement:
                  formulaire.bureauEncaissement.trim(),

                observations:
                  formulaire.observations.trim(),

                statut,
                updatedAt: maintenant,
              }
            : paiement,
        ),
      );

      setMessage(
        "Le paiement a été modifié avec succès.",
      );
    } else {
      const nouveauPaiement: PaiementProvincial = {
        id: crypto.randomUUID(),
        numero: genererNumeroPaiement(),

        personneId: formulaire.personneId,
        payeurNom: personneSelectionnee.nomComplet,
        payeurNumero: personneSelectionnee.numero,

        activiteId: formulaire.activiteId,
        activiteNom:
          activiteSelectionnee?.nomActivite || "",
        activiteNumero:
          activiteSelectionnee?.numero || "",

        taxeId: taxeSelectionnee.id,
        taxeNumero: taxeSelectionnee.numero,
        taxeNom: taxeSelectionnee.nom,
        taxeCategorie: taxeSelectionnee.categorie,
        taxeFrequence: taxeSelectionnee.frequence,

        montantDu,
        montantPaye,
        devise: formulaire.devise,

        modePaiement: formulaire.modePaiement,
        referenceTransaction:
          formulaire.referenceTransaction.trim(),

        datePaiement: formulaire.datePaiement,
        periodeConcernee:
          formulaire.periodeConcernee.trim(),

        agentEncaisseur:
          formulaire.agentEncaisseur.trim(),

        bureauEncaissement:
          formulaire.bureauEncaissement.trim(),

        observations: formulaire.observations.trim(),

        statut,

        createdAt: maintenant,
        updatedAt: maintenant,
      };

      setPaiements((anciensPaiements) => [
        nouveauPaiement,
        ...anciensPaiements,
      ]);

      setMessage(
        `Le paiement ${nouveauPaiement.numero} a été enregistré avec succès.`,
      );
    }

    fermerFormulaire(false);
  }

  function ouvrirNouveauFormulaire() {
    setFormulaire(creerFormulaireInitial());
    setPaiementEnModification(null);
    setPaiementConsulte(null);
    setFormulaireVisible(true);
    setErreur("");
    setMessage("");
  }

  function fermerFormulaire(effacerMessage = true) {
    setFormulaire(creerFormulaireInitial());
    setPaiementEnModification(null);
    setFormulaireVisible(false);
    setErreur("");

    if (effacerMessage) {
      setMessage("");
    }
  }

  function modifierPaiement(
    paiement: PaiementProvincial,
  ) {
    if (
      paiement.statut === "Annulé" ||
      paiement.statut === "Remboursé"
    ) {
      setErreur(
        "Un paiement annulé ou remboursé ne peut plus être modifié.",
      );
      setPaiementConsulte(null);
      return;
    }

    setFormulaire({
      personneId: paiement.personneId,
      activiteId: paiement.activiteId,
      taxeId: paiement.taxeId,

      montantDu: String(paiement.montantDu),
      montantPaye: String(paiement.montantPaye),
      devise: paiement.devise,

      modePaiement: paiement.modePaiement,
      referenceTransaction:
        paiement.referenceTransaction,
      datePaiement: paiement.datePaiement,
      periodeConcernee: paiement.periodeConcernee,

      agentEncaisseur: paiement.agentEncaisseur,
      bureauEncaissement:
        paiement.bureauEncaissement,
      observations: paiement.observations,
    });

    setPaiementEnModification(paiement.id);
    setPaiementConsulte(null);
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
    nouveauStatut: StatutPaiement,
  ) {
    const maintenant = new Date().toISOString();

    setPaiements((anciensPaiements) =>
      anciensPaiements.map((paiement) =>
        paiement.id === id
          ? {
              ...paiement,
              statut: nouveauStatut,
              updatedAt: maintenant,
            }
          : paiement,
      ),
    );

    setPaiementConsulte((ancienPaiement) =>
      ancienPaiement?.id === id
        ? {
            ...ancienPaiement,
            statut: nouveauStatut,
            updatedAt: maintenant,
          }
        : ancienPaiement,
    );

    setMessage(
      `Le paiement est maintenant marqué « ${nouveauStatut} ».`,
    );
  }

  function annulerPaiement(
    paiement: PaiementProvincial,
  ) {
    const confirmation = window.confirm(
      `Voulez-vous annuler le paiement ${paiement.numero} ?`,
    );

    if (!confirmation) {
      return;
    }

    changerStatut(paiement.id, "Annulé");
  }

  function rembourserPaiement(
    paiement: PaiementProvincial,
  ) {
    const confirmation = window.confirm(
      `Confirmez-vous le remboursement du paiement ${paiement.numero} ?`,
    );

    if (!confirmation) {
      return;
    }

    changerStatut(paiement.id, "Remboursé");
  }

  function completerPaiement(
    paiement: PaiementProvincial,
  ) {
    if (paiement.statut !== "Partiel") {
      return;
    }

    setFormulaire({
      personneId: paiement.personneId,
      activiteId: paiement.activiteId,
      taxeId: paiement.taxeId,

      montantDu: String(paiement.montantDu),
      montantPaye: String(paiement.montantDu),
      devise: paiement.devise,

      modePaiement: paiement.modePaiement,
      referenceTransaction:
        paiement.referenceTransaction,
      datePaiement: obtenirDateAujourdhui(),
      periodeConcernee: paiement.periodeConcernee,

      agentEncaisseur: paiement.agentEncaisseur,
      bureauEncaissement:
        paiement.bureauEncaissement,

      observations: paiement.observations
        ? `${paiement.observations} — Paiement complété`
        : "Paiement complété",
    });

    setPaiementEnModification(paiement.id);
    setPaiementConsulte(null);
    setFormulaireVisible(true);
    setErreur("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function obtenirStyleStatut(
    statut: StatutPaiement,
  ) {
    if (statut === "Payé") {
      return "bg-green-100 text-green-800";
    }

    if (statut === "Partiel") {
      return "bg-orange-100 text-orange-800";
    }

    if (statut === "Remboursé") {
      return "bg-purple-100 text-purple-800";
    }

    return "bg-red-100 text-red-800";
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
                Paiements provinciaux
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin/taxes"
              className="hidden rounded-xl border border-black/15 bg-white/30 px-4 py-2.5 text-sm font-extrabold text-black transition hover:bg-white/50 sm:inline-flex"
            >
              Taxes
            </Link>

            <Link
              href="/admin/personnes"
              className="hidden rounded-xl border border-black/15 bg-white/30 px-4 py-2.5 text-sm font-extrabold text-black transition hover:bg-white/50 md:inline-flex"
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
              Administration financière
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-black md:text-4xl">
              Paiements provinciaux
            </h1>

            <p className="mt-3 max-w-3xl leading-7 text-neutral-600">
              Enregistrez les paiements des taxes, cartes,
              permis, autorisations et activités provinciales.
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
              : "+ Nouveau paiement"}
          </button>
        </section>

        {personnesDisponibles.length === 0 && (
          <AlerteConfiguration
            titre="Aucune personne disponible"
            description="Enregistrez d’abord une personne active avant de saisir un paiement."
            lien="/admin/personnes"
            bouton="Enregistrer une personne"
          />
        )}

        {taxesActives.length === 0 && (
          <AlerteConfiguration
            titre="Aucune taxe active"
            description="Créez ou activez au moins une taxe provinciale avant d’enregistrer un paiement."
            lien="/admin/taxes"
            bouton="Configurer les taxes"
          />
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
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <CarteStatistique
            titre="Total paiements"
            valeur={String(statistiques.total)}
            couleur="text-black"
          />

          <CarteStatistique
            titre="Paiements complets"
            valeur={String(statistiques.payes)}
            couleur="text-green-700"
          />

          <CarteStatistique
            titre="Paiements partiels"
            valeur={String(statistiques.partiels)}
            couleur="text-orange-600"
          />

          <CarteStatistique
            titre="Total encaissé CDF"
            valeur={formaterMontant(
              statistiques.totalCDF,
              "CDF",
            )}
            couleur="text-green-700"
          />

          <CarteStatistique
            titre="Total encaissé USD"
            valeur={formaterMontant(
              statistiques.totalUSD,
              "USD",
            )}
            couleur="text-blue-700"
          />
        </section>

        {/* Formulaire */}
        {formulaireVisible && (
          <section className="mt-7 overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/10 bg-black px-6 py-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                Encaissement
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {paiementEnModification
                  ? "Modifier le paiement"
                  : "Enregistrer un paiement"}
              </h2>
            </div>

            <form
              onSubmit={enregistrerPaiement}
              className="grid gap-7 p-6 xl:grid-cols-[1fr_400px]"
            >
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="personne"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Personne concernée
                    </label>

                    <select
                      id="personne"
                      value={formulaire.personneId}
                      onChange={(event) =>
                        choisirPersonne(event.target.value)
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="">
                        Sélectionner une personne
                      </option>

                      {personnesDisponibles.map(
                        (personne) => (
                          <option
                            key={personne.id}
                            value={personne.id}
                          >
                            {personne.nomComplet} —{" "}
                            {personne.numero}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="activite"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Activité concernée
                      {taxeExigeActivite(
                        taxeSelectionnee,
                      )
                        ? " *"
                        : " — facultatif"}
                    </label>

                    <select
                      id="activite"
                      value={formulaire.activiteId}
                      onChange={(event) =>
                        modifierChamp(
                          "activiteId",
                          event.target.value,
                        )
                      }
                      disabled={!formulaire.personneId}
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">
                        {formulaire.personneId
                          ? "Aucune activité"
                          : "Choisissez d’abord la personne"}
                      </option>

                      {activitesDeLaPersonne.map(
                        (activite) => (
                          <option
                            key={activite.id}
                            value={activite.id}
                          >
                            {activite.nomActivite} —{" "}
                            {activite.numero}
                          </option>
                        ),
                      )}
                    </select>

                    {formulaire.personneId &&
                      taxeExigeActivite(
                        taxeSelectionnee,
                      ) &&
                      activitesDeLaPersonne.length === 0 && (
                        <p className="mt-2 text-sm font-bold text-red-700">
                          Cette personne ne possède aucune
                          activité disponible.
                        </p>
                      )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="taxe"
                    className="mb-2 block text-sm font-extrabold text-black"
                  >
                    Taxe ou frais à payer
                  </label>

                  <select
                    id="taxe"
                    value={formulaire.taxeId}
                    onChange={(event) =>
                      choisirTaxe(event.target.value)
                    }
                    className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="">
                      Sélectionner une taxe active
                    </option>

                    {taxesActives.map((taxe) => (
                      <option
                        key={taxe.id}
                        value={taxe.id}
                      >
                        {taxe.nom} —{" "}
                        {formaterMontant(
                          taxe.montant,
                          taxe.devise,
                        )}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <ChampNombre
                    id="montant-du"
                    label="Montant dû"
                    value={formulaire.montantDu}
                    devise={formulaire.devise}
                    onChange={(valeur) =>
                      modifierChamp("montantDu", valeur)
                    }
                  />

                  <ChampNombre
                    id="montant-paye"
                    label="Montant payé"
                    value={formulaire.montantPaye}
                    devise={formulaire.devise}
                    onChange={(valeur) =>
                      modifierChamp("montantPaye", valeur)
                    }
                  />

                  <div>
                    <label
                      htmlFor="devise"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Devise
                    </label>

                    <select
                      id="devise"
                      value={formulaire.devise}
                      onChange={(event) =>
                        modifierChamp(
                          "devise",
                          event.target.value as Devise,
                        )
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="CDF">CDF</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <ChampSelection
                    id="mode-paiement"
                    label="Mode de paiement"
                    value={formulaire.modePaiement}
                    options={modesPaiement}
                    onChange={(valeur) =>
                      modifierChamp(
                        "modePaiement",
                        valeur,
                      )
                    }
                  />

                  <ChampTexte
                    id="reference"
                    label="Référence de transaction"
                    value={
                      formulaire.referenceTransaction
                    }
                    placeholder={
                      formulaire.modePaiement === "Espèces"
                        ? "Facultatif"
                        : "Référence obligatoire"
                    }
                    onChange={(valeur) =>
                      modifierChamp(
                        "referenceTransaction",
                        valeur,
                      )
                    }
                  />

                  <div>
                    <label
                      htmlFor="date-paiement"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Date du paiement
                    </label>

                    <input
                      id="date-paiement"
                      type="date"
                      value={formulaire.datePaiement}
                      onChange={(event) =>
                        modifierChamp(
                          "datePaiement",
                          event.target.value,
                        )
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <ChampTexte
                    id="periode"
                    label="Période concernée"
                    value={formulaire.periodeConcernee}
                    placeholder="Exemple : Année 2026"
                    onChange={(valeur) =>
                      modifierChamp(
                        "periodeConcernee",
                        valeur,
                      )
                    }
                  />

                  <ChampTexte
                    id="agent"
                    label="Agent encaisseur"
                    value={formulaire.agentEncaisseur}
                    placeholder="Nom de l’agent"
                    onChange={(valeur) =>
                      modifierChamp(
                        "agentEncaisseur",
                        valeur,
                      )
                    }
                  />
                </div>

                <ChampSelection
                  id="bureau"
                  label="Bureau d’encaissement"
                  value={formulaire.bureauEncaissement}
                  options={bureauxEncaissement}
                  onChange={(valeur) =>
                    modifierChamp(
                      "bureauEncaissement",
                      valeur,
                    )
                  }
                />

                <div>
                  <label
                    htmlFor="observations"
                    className="mb-2 block text-sm font-extrabold text-black"
                  >
                    Observations
                  </label>

                  <textarea
                    id="observations"
                    value={formulaire.observations}
                    onChange={(event) =>
                      modifierChamp(
                        "observations",
                        event.target.value,
                      )
                    }
                    placeholder="Précision, motif du paiement partiel ou autre information..."
                    className="min-h-28 w-full resize-y rounded-xl border border-black/15 bg-neutral-50 px-4 py-3 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-black/10 pt-6 sm:flex-row">
                  <button
                    type="submit"
                    className="min-h-14 rounded-xl bg-orange-500 px-7 font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                  >
                    {paiementEnModification
                      ? "Enregistrer les modifications"
                      : "Enregistrer le paiement"}
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

              {/* Résumé */}
              <aside>
                <p className="mb-2 text-sm font-extrabold text-black">
                  Résumé de l’encaissement
                </p>

                <div className="overflow-hidden rounded-[26px] border-4 border-black bg-white shadow-xl">
                  <div className="bg-orange-500 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-xs font-black text-white">
                        PC
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${obtenirStyleStatut(
                          statutApercu,
                        )}`}
                      >
                        {statutApercu}
                      </span>
                    </div>

                    <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-black/60">
                      Paiement provincial
                    </p>

                    <h3 className="mt-2 text-xl font-black leading-tight text-black">
                      {taxeSelectionnee?.nom ||
                        "Taxe non sélectionnée"}
                    </h3>
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                      Montant payé
                    </p>

                    <p className="mt-2 text-3xl font-black text-green-700">
                      {formaterMontant(
                        montantPayeApercu,
                        formulaire.devise,
                      )}
                    </p>

                    <div className="mt-6 space-y-4">
                      <Resume
                        label="Payeur"
                        valeur={
                          personneSelectionnee?.nomComplet ||
                          "Non sélectionné"
                        }
                      />

                      <Resume
                        label="Activité"
                        valeur={
                          activiteSelectionnee?.nomActivite ||
                          "Aucune"
                        }
                      />

                      <Resume
                        label="Montant dû"
                        valeur={formaterMontant(
                          montantDuApercu,
                          formulaire.devise,
                        )}
                      />

                      <Resume
                        label="Reste à payer"
                        valeur={formaterMontant(
                          resteAPayerApercu,
                          formulaire.devise,
                        )}
                      />

                      <Resume
                        label="Mode"
                        valeur={formulaire.modePaiement}
                      />

                      <Resume
                        label="Date"
                        valeur={formaterDate(
                          formulaire.datePaiement,
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-extrabold text-green-900">
                    Reçu numérique
                  </p>

                  <p className="mt-2 text-sm leading-6 text-green-800">
                    Après l’enregistrement, ce paiement sera
                    disponible dans le prochain module des reçus
                    numériques.
                  </p>
                </div>
              </aside>
            </form>
          </section>
        )}

        {/* Filtres */}
        <section className="mt-7 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_190px_190px_220px]">
            <input
              type="search"
              value={recherche}
              onChange={(event) =>
                setRecherche(event.target.value)
              }
              placeholder="Rechercher par numéro, payeur, taxe, activité ou référence..."
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />

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
              <option value="Tous">Tous les statuts</option>
              <option value="Payé">Payés</option>
              <option value="Partiel">Partiels</option>
              <option value="Annulé">Annulés</option>
              <option value="Remboursé">Remboursés</option>
            </select>

            <select
              value={filtreMode}
              onChange={(event) =>
                setFiltreMode(event.target.value)
              }
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="Tous">
                Tous les modes
              </option>

              {modesPaiement.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Liste */}
        <section className="mt-7">
          {paiementsFiltres.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 font-black text-neutral-500">
                PAY
              </div>

              <h2 className="mt-5 text-xl font-black text-black">
                Aucun paiement enregistré
              </h2>

              <p className="mx-auto mt-3 max-w-lg leading-7 text-neutral-500">
                Utilisez le bouton « Nouveau paiement » pour
                enregistrer le premier encaissement provincial.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1350px] border-collapse text-left">
                  <thead className="bg-neutral-50">
                    <tr className="text-xs uppercase tracking-wider text-neutral-500">
                      <th className="px-5 py-4 font-black">
                        Payeur
                      </th>
                      <th className="px-5 py-4 font-black">
                        Numéro
                      </th>
                      <th className="px-5 py-4 font-black">
                        Taxe
                      </th>
                      <th className="px-5 py-4 font-black">
                        Montant dû
                      </th>
                      <th className="px-5 py-4 font-black">
                        Montant payé
                      </th>
                      <th className="px-5 py-4 font-black">
                        Mode
                      </th>
                      <th className="px-5 py-4 font-black">
                        Date
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
                    {paiementsFiltres.map((paiement) => (
                      <tr
                        key={paiement.id}
                        className="border-t border-black/5 transition hover:bg-orange-50/40"
                      >
                        <td className="px-5 py-4">
                          <p className="font-extrabold text-black">
                            {paiement.payeurNom}
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            {paiement.payeurNumero}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-extrabold text-black">
                          {paiement.numero}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-neutral-700">
                            {paiement.taxeNom}
                          </p>

                          {paiement.activiteNom && (
                            <p className="mt-1 text-xs text-neutral-500">
                              {paiement.activiteNom}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-neutral-600">
                          {formaterMontant(
                            paiement.montantDu,
                            paiement.devise,
                          )}
                        </td>

                        <td className="px-5 py-4 font-black text-green-700">
                          {formaterMontant(
                            paiement.montantPaye,
                            paiement.devise,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600">
                          {paiement.modePaiement}
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600">
                          {formaterDate(
                            paiement.datePaiement,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold ${obtenirStyleStatut(
                              paiement.statut,
                            )}`}
                          >
                            {paiement.statut}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPaiementConsulte(paiement)
                              }
                              className="rounded-lg bg-black px-3 py-2 text-xs font-extrabold text-white transition hover:bg-green-800"
                            >
                              Consulter
                            </button>

                            {paiement.statut !== "Annulé" &&
                              paiement.statut !==
                                "Remboursé" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    modifierPaiement(
                                      paiement,
                                    )
                                  }
                                  className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-700 transition hover:bg-orange-100"
                                >
                                  Modifier
                                </button>
                              )}

                            {paiement.statut === "Partiel" && (
                              <button
                                type="button"
                                onClick={() =>
                                  completerPaiement(
                                    paiement,
                                  )
                                }
                                className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-extrabold text-green-700 transition hover:bg-green-100"
                              >
                                Compléter
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

      {/* Consultation */}
      {paiementConsulte && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="my-8 w-full max-w-5xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-5 bg-black px-6 py-5 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                  Paiement provincial
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {paiementConsulte.numero}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPaiementConsulte(null)
                }
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl transition hover:bg-white/20"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-orange-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-orange-700">
                    Montant dû
                  </p>

                  <p className="mt-2 text-2xl font-black text-black">
                    {formaterMontant(
                      paiementConsulte.montantDu,
                      paiementConsulte.devise,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-green-700">
                    Montant payé
                  </p>

                  <p className="mt-2 text-2xl font-black text-green-800">
                    {formaterMontant(
                      paiementConsulte.montantPaye,
                      paiementConsulte.devise,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-100 p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-neutral-500">
                    Reste à payer
                  </p>

                  <p className="mt-2 text-2xl font-black text-black">
                    {formaterMontant(
                      Math.max(
                        paiementConsulte.montantDu -
                          paiementConsulte.montantPaye,
                        0,
                      ),
                      paiementConsulte.devise,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Information
                  label="Payeur"
                  valeur={paiementConsulte.payeurNom}
                />

                <Information
                  label="Numéro du payeur"
                  valeur={
                    paiementConsulte.payeurNumero
                  }
                />

                <Information
                  label="Taxe"
                  valeur={paiementConsulte.taxeNom}
                />

                <Information
                  label="Numéro de la taxe"
                  valeur={paiementConsulte.taxeNumero}
                />

                <Information
                  label="Activité"
                  valeur={
                    paiementConsulte.activiteNom ||
                    "Aucune activité liée"
                  }
                />

                <Information
                  label="Mode de paiement"
                  valeur={
                    paiementConsulte.modePaiement
                  }
                />

                <Information
                  label="Référence"
                  valeur={
                    paiementConsulte.referenceTransaction ||
                    "Aucune référence"
                  }
                />

                <Information
                  label="Date du paiement"
                  valeur={formaterDate(
                    paiementConsulte.datePaiement,
                  )}
                />

                <Information
                  label="Période concernée"
                  valeur={
                    paiementConsulte.periodeConcernee ||
                    "Non renseignée"
                  }
                />

                <Information
                  label="Agent encaisseur"
                  valeur={
                    paiementConsulte.agentEncaisseur
                  }
                />

                <Information
                  label="Bureau"
                  valeur={
                    paiementConsulte.bureauEncaissement
                  }
                />

                <Information
                  label="Statut"
                  valeur={paiementConsulte.statut}
                />
              </div>

              <div className="mt-7 border-t border-black/10 pt-6">
                <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                  Observations
                </p>

                <p className="mt-3 leading-7 text-neutral-700">
                  {paiementConsulte.observations ||
                    "Aucune observation ajoutée."}
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {paiementConsulte.statut !== "Annulé" &&
                  paiementConsulte.statut !==
                    "Remboursé" && (
                    <button
                      type="button"
                      onClick={() =>
                        modifierPaiement(
                          paiementConsulte,
                        )
                      }
                      className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-orange-600"
                    >
                      Modifier le paiement
                    </button>
                  )}

                {paiementConsulte.statut === "Partiel" && (
                  <button
                    type="button"
                    onClick={() =>
                      completerPaiement(
                        paiementConsulte,
                      )
                    }
                    className="rounded-xl bg-green-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-green-800"
                  >
                    Compléter le paiement
                  </button>
                )}

                {(paiementConsulte.statut === "Payé" ||
                  paiementConsulte.statut ===
                    "Partiel") && (
                  <button
                    type="button"
                    onClick={() =>
                      annulerPaiement(
                        paiementConsulte,
                      )
                    }
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-red-700"
                  >
                    Annuler le paiement
                  </button>
                )}

                {paiementConsulte.statut === "Payé" && (
                  <button
                    type="button"
                    onClick={() =>
                      rembourserPaiement(
                        paiementConsulte,
                      )
                    }
                    className="rounded-xl bg-purple-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-purple-800"
                  >
                    Marquer comme remboursé
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

type AlerteConfigurationProps = {
  titre: string;
  description: string;
  lien: string;
  bouton: string;
};

function AlerteConfiguration({
  titre,
  description,
  lien,
  bouton,
}: AlerteConfigurationProps) {
  return (
    <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-extrabold text-orange-900">
          {titre}
        </p>

        <p className="mt-1 text-sm leading-6 text-orange-800">
          {description}
        </p>
      </div>

      <Link
        href={lien}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-extrabold text-white"
      >
        {bouton}
      </Link>
    </div>
  );
}

type CarteStatistiqueProps = {
  titre: string;
  valeur: string;
  couleur: string;
};

function CarteStatistique({
  titre,
  valeur,
  couleur,
}: CarteStatistiqueProps) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-neutral-500">
        {titre}
      </p>

      <p
        className={`mt-3 break-words text-2xl font-black ${couleur}`}
      >
        {valeur}
      </p>
    </article>
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
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
      />
    </div>
  );
}

type ChampNombreProps = {
  id: string;
  label: string;
  value: string;
  devise: Devise;
  onChange: (valeur: string) => void;
};

function ChampNombre({
  id,
  label,
  value,
  devise,
  onChange,
}: ChampNombreProps) {
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
        type="number"
        min="0"
        step={devise === "CDF" ? "1" : "0.01"}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder="0"
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
        onChange={(event) =>
          onChange(event.target.value)
        }
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

      <span className="max-w-[210px] text-right text-sm font-extrabold text-black">
        {valeur}
      </span>
    </div>
  );
}

type InformationProps = {
  label: string;
  valeur: string;
};

function Information({
  label,
  valeur,
}: InformationProps) {
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



