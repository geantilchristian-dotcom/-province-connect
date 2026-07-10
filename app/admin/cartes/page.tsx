"use client";

import Link from "next/link";
import QRCode from "qrcode";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSupabaseCollection } from "../../../lib/data/useSupabaseCollection";

type StatutCarte =
  | "Brouillon"
  | "Valide"
  | "Expiré"
  | "Suspendu"
  | "Révoqué";

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
  statut: string;
};

type TypeDocument = {
  code: string;
  nom: string;
  categorie: string;
  dureeMois: number;
  activiteObligatoire: boolean;
};

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

type FormulaireCarte = {
  personneId: string;
  activiteId: string;
  typeDocumentCode: string;
  dateDelivrance: string;
  dateExpiration: string;
  communeDelivrance: string;
  autoriteDelivrante: string;
  observations: string;
  statut: StatutCarte;
};

const CLE_PERSONNES = "province-connect-personnes";
const CLE_ACTIVITES = "province-connect-activites";
const CLE_CARTES = "province-connect-cartes";

const typesDocuments: TypeDocument[] = [
  {
    code: "COM",
    nom: "Carte commerçant",
    categorie: "Commerce",
    dureeMois: 12,
    activiteObligatoire: true,
  },
  {
    code: "ART",
    nom: "Carte artiste",
    categorie: "Culture et arts",
    dureeMois: 24,
    activiteObligatoire: false,
  },
  {
    code: "ENS",
    nom: "Carte enseignant",
    categorie: "Éducation",
    dureeMois: 24,
    activiteObligatoire: false,
  },
  {
    code: "PAS",
    nom: "Carte pasteur",
    categorie: "Religion",
    dureeMois: 24,
    activiteObligatoire: false,
  },
  {
    code: "TRP",
    nom: "Carte transporteur",
    categorie: "Transport",
    dureeMois: 12,
    activiteObligatoire: true,
  },
  {
    code: "CDP",
    nom: "Permis de conduire provincial",
    categorie: "Transport",
    dureeMois: 24,
    activiteObligatoire: false,
  },
  {
    code: "AGT",
    nom: "Carte agent administratif",
    categorie: "Administration",
    dureeMois: 24,
    activiteObligatoire: false,
  },
  {
    code: "SOC",
    nom: "Carte structure sociale",
    categorie: "Secteur social",
    dureeMois: 24,
    activiteObligatoire: false,
  },
  {
    code: "ACT",
    nom: "Autorisation d’activité",
    categorie: "Activités professionnelles",
    dureeMois: 12,
    activiteObligatoire: true,
  },
];

function obtenirDateAujourdhui() {
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = String(maintenant.getMonth() + 1).padStart(2, "0");
  const jour = String(maintenant.getDate()).padStart(2, "0");

  return `${annee}-${mois}-${jour}`;
}

function ajouterMois(date: string, nombreMois: number) {
  if (!date) {
    return "";
  }

  const nouvelleDate = new Date(`${date}T12:00:00`);
  nouvelleDate.setMonth(nouvelleDate.getMonth() + nombreMois);

  const annee = nouvelleDate.getFullYear();
  const mois = String(nouvelleDate.getMonth() + 1).padStart(2, "0");
  const jour = String(nouvelleDate.getDate()).padStart(2, "0");

  return `${annee}-${mois}-${jour}`;
}

function creerFormulaireInitial(): FormulaireCarte {
  const typeInitial = typesDocuments[0];
  const dateDelivrance = obtenirDateAujourdhui();

  return {
    personneId: "",
    activiteId: "",
    typeDocumentCode: typeInitial.code,
    dateDelivrance,
    dateExpiration: ajouterMois(
      dateDelivrance,
      typeInitial.dureeMois,
    ),
    communeDelivrance: "",
    autoriteDelivrante: "Administration provinciale",
    observations: "",
    statut: "Brouillon",
  };
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

function echapperHtml(texte: string) {
  return texte
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function AdminCartesPage() {
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [cartes, setCartes] = useState<CarteProvinciale[]>([]);


  const [formulaire, setFormulaire] =
    useState<FormulaireCarte>(creerFormulaireInitial);

  const [formulaireVisible, setFormulaireVisible] = useState(false);

  const [carteEnModification, setCarteEnModification] = useState<
    string | null
  >(null);

  const [carteConsultee, setCarteConsultee] =
    useState<CarteProvinciale | null>(null);

  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState("Tous");
  const [filtreStatut, setFiltreStatut] = useState("Tous");

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
    table: "cartes",
    items: cartes,
    setItems: setCartes,
    localStorageKey: CLE_CARTES,
    normaliser: (donnees) => {
      const aujourdHui = obtenirDateAujourdhui();

      return donnees.map((carte) =>
        carte.statut === "Valide" &&
        carte.dateExpiration &&
        carte.dateExpiration < aujourdHui
          ? {
              ...carte,
              statut: "Expiré" as StatutCarte,
              updatedAt: new Date().toISOString(),
            }
          : carte,
      );
    },
    onError: setErreur,
  });

  const personnesDisponibles = useMemo(() => {
    return personnes
      .filter((personne) => personne.statut !== "Archivé")
      .sort((premiere, deuxieme) =>
        premiere.nomComplet.localeCompare(
          deuxieme.nomComplet,
          "fr",
        ),
      );
  }, [personnes]);

  const personneSelectionnee = useMemo(() => {
    return (
      personnes.find(
        (personne) => personne.id === formulaire.personneId,
      ) || null
    );
  }, [personnes, formulaire.personneId]);

  const typeDocumentSelectionne = useMemo(() => {
    return (
      typesDocuments.find(
        (typeDocument) =>
          typeDocument.code === formulaire.typeDocumentCode,
      ) || typesDocuments[0]
    );
  }, [formulaire.typeDocumentCode]);

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

  const activiteSelectionnee = useMemo(() => {
    return (
      activites.find(
        (activite) => activite.id === formulaire.activiteId,
      ) || null
    );
  }, [activites, formulaire.activiteId]);

  const statistiques = useMemo(() => {
    return {
      total: cartes.length,

      valides: cartes.filter(
        (carte) => carte.statut === "Valide",
      ).length,

      brouillons: cartes.filter(
        (carte) => carte.statut === "Brouillon",
      ).length,

      suspendues: cartes.filter(
        (carte) =>
          carte.statut === "Suspendu" ||
          carte.statut === "Révoqué",
      ).length,
    };
  }, [cartes]);

  const cartesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return cartes.filter((carte) => {
      const correspondRecherche =
        !terme ||
        carte.numeroDocument.toLowerCase().includes(terme) ||
        carte.titulaireNom.toLowerCase().includes(terme) ||
        carte.titulaireNumero.toLowerCase().includes(terme) ||
        carte.typeDocumentNom.toLowerCase().includes(terme) ||
        carte.activiteNom.toLowerCase().includes(terme);

      const correspondType =
        filtreType === "Tous" ||
        carte.typeDocumentCode === filtreType;

      const correspondStatut =
        filtreStatut === "Tous" ||
        carte.statut === filtreStatut;

      return (
        correspondRecherche &&
        correspondType &&
        correspondStatut
      );
    });
  }, [cartes, recherche, filtreType, filtreStatut]);

  function trouverPersonne(personneId: string) {
    return (
      personnes.find((personne) => personne.id === personneId) ||
      null
    );
  }

  function modifierChamp<K extends keyof FormulaireCarte>(
    champ: K,
    valeur: FormulaireCarte[K],
  ) {
    setFormulaire((ancienFormulaire) => ({
      ...ancienFormulaire,
      [champ]: valeur,
    }));

    setErreur("");
    setMessage("");
  }

  function choisirPersonne(personneId: string) {
    const personne = personnes.find(
      (element) => element.id === personneId,
    );

    setFormulaire((ancienFormulaire) => ({
      ...ancienFormulaire,
      personneId,
      activiteId: "",
      communeDelivrance:
        personne?.commune ||
        ancienFormulaire.communeDelivrance,
    }));

    setErreur("");
    setMessage("");
  }

  function choisirActivite(activiteId: string) {
    const activite = activites.find(
      (element) => element.id === activiteId,
    );

    setFormulaire((ancienFormulaire) => ({
      ...ancienFormulaire,
      activiteId,
      communeDelivrance:
        activite?.commune ||
        ancienFormulaire.communeDelivrance,
    }));

    setErreur("");
    setMessage("");
  }

  function choisirTypeDocument(code: string) {
    const typeDocument = typesDocuments.find(
      (element) => element.code === code,
    );

    setFormulaire((ancienFormulaire) => ({
      ...ancienFormulaire,
      typeDocumentCode: code,
      activiteId: typeDocument?.activiteObligatoire
        ? ancienFormulaire.activiteId
        : ancienFormulaire.activiteId,
      dateExpiration: ajouterMois(
        ancienFormulaire.dateDelivrance,
        typeDocument?.dureeMois || 12,
      ),
    }));

    setErreur("");
    setMessage("");
  }

  function modifierDateDelivrance(date: string) {
    setFormulaire((ancienFormulaire) => ({
      ...ancienFormulaire,
      dateDelivrance: date,
      dateExpiration: ajouterMois(
        date,
        typeDocumentSelectionne.dureeMois,
      ),
    }));

    setErreur("");
    setMessage("");
  }

  function genererNumeroDocument(codeDocument: string) {
    const annee = new Date().getFullYear();

    const plusGrandNumero = cartes.reduce(
      (valeurMaximale, carte) => {
        if (
          carte.typeDocumentCode !== codeDocument ||
          !carte.numeroDocument.includes(`-${annee}-`)
        ) {
          return valeurMaximale;
        }

        const dernierePartie =
          carte.numeroDocument.split("-").pop();

        const numero = Number(dernierePartie);

        return Number.isFinite(numero)
          ? Math.max(valeurMaximale, numero)
          : valeurMaximale;
      },
      0,
    );

    return `PC-${codeDocument}-${annee}-${String(
      plusGrandNumero + 1,
    ).padStart(6, "0")}`;
  }

  function verifierFormulaire() {
    if (!formulaire.personneId) {
      return "Veuillez sélectionner le titulaire du document.";
    }

    if (
      personneSelectionnee?.statut === "Archivé" ||
      personneSelectionnee?.statut === "Suspendu"
    ) {
      return "Le dossier du titulaire n’est pas actif.";
    }

    if (
      typeDocumentSelectionne.activiteObligatoire &&
      !formulaire.activiteId
    ) {
      return `Une activité est obligatoire pour le document « ${typeDocumentSelectionne.nom} ».`;
    }

    if (!formulaire.dateDelivrance) {
      return "La date de délivrance est obligatoire.";
    }

    if (!formulaire.dateExpiration) {
      return "La date d’expiration est obligatoire.";
    }

    if (
      formulaire.dateExpiration <= formulaire.dateDelivrance
    ) {
      return "La date d’expiration doit être postérieure à la date de délivrance.";
    }

    if (!formulaire.communeDelivrance.trim()) {
      return "La commune de délivrance est obligatoire.";
    }

    if (!formulaire.autoriteDelivrante.trim()) {
      return "L’autorité de délivrance est obligatoire.";
    }

    const documentActifExiste = cartes.some(
      (carte) =>
        carte.personneId === formulaire.personneId &&
        carte.typeDocumentCode ===
          formulaire.typeDocumentCode &&
        carte.statut === "Valide" &&
        carte.id !== carteEnModification,
    );

    if (documentActifExiste) {
      return "Ce titulaire possède déjà un document valide de cette catégorie.";
    }

    return "";
  }

  function enregistrerCarte(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErreur("");
    setMessage("");

    const erreurValidation = verifierFormulaire();

    if (erreurValidation) {
      setErreur(erreurValidation);
      return;
    }

    if (!personneSelectionnee) {
      setErreur("Le titulaire sélectionné est introuvable.");
      return;
    }

    const maintenant = new Date().toISOString();

    if (carteEnModification) {
      setCartes((anciennesCartes) =>
        anciennesCartes.map((carte) =>
          carte.id === carteEnModification
            ? {
                ...carte,

                personneId: formulaire.personneId,
                titulaireNom:
                  personneSelectionnee.nomComplet,
                titulaireNumero:
                  personneSelectionnee.numero,

                activiteId: formulaire.activiteId,
                activiteNom:
                  activiteSelectionnee?.nomActivite || "",

                typeDocumentCode:
                  typeDocumentSelectionne.code,
                typeDocumentNom:
                  typeDocumentSelectionne.nom,
                categorieDocument:
                  typeDocumentSelectionne.categorie,

                dateDelivrance:
                  formulaire.dateDelivrance,
                dateExpiration:
                  formulaire.dateExpiration,

                communeDelivrance:
                  formulaire.communeDelivrance.trim(),

                autoriteDelivrante:
                  formulaire.autoriteDelivrante.trim(),

                observations:
                  formulaire.observations.trim(),

                statut: formulaire.statut,
                updatedAt: maintenant,
              }
            : carte,
        ),
      );

      setMessage("Le document a été modifié avec succès.");
    } else {
      const nouvelleCarte: CarteProvinciale = {
        id: crypto.randomUUID(),

        numeroDocument: genererNumeroDocument(
          typeDocumentSelectionne.code,
        ),

        personneId: formulaire.personneId,
        titulaireNom: personneSelectionnee.nomComplet,
        titulaireNumero: personneSelectionnee.numero,

        activiteId: formulaire.activiteId,
        activiteNom:
          activiteSelectionnee?.nomActivite || "",

        typeDocumentCode: typeDocumentSelectionne.code,
        typeDocumentNom: typeDocumentSelectionne.nom,
        categorieDocument:
          typeDocumentSelectionne.categorie,

        dateDelivrance: formulaire.dateDelivrance,
        dateExpiration: formulaire.dateExpiration,

        communeDelivrance:
          formulaire.communeDelivrance.trim(),

        autoriteDelivrante:
          formulaire.autoriteDelivrante.trim(),

        observations: formulaire.observations.trim(),

        statut: formulaire.statut,

        createdAt: maintenant,
        updatedAt: maintenant,
      };

      setCartes((anciennesCartes) => [
        nouvelleCarte,
        ...anciennesCartes,
      ]);

      setMessage(
        `Le document ${nouvelleCarte.numeroDocument} a été créé avec succès.`,
      );
    }

    fermerFormulaire(false);
  }

  function ouvrirNouveauFormulaire() {
    setFormulaire(creerFormulaireInitial());
    setCarteEnModification(null);
    setCarteConsultee(null);
    setFormulaireVisible(true);
    setErreur("");
    setMessage("");
  }

  function fermerFormulaire(effacerMessage = true) {
    setFormulaire(creerFormulaireInitial());
    setCarteEnModification(null);
    setFormulaireVisible(false);
    setErreur("");

    if (effacerMessage) {
      setMessage("");
    }
  }

  function modifierCarte(carte: CarteProvinciale) {
    setFormulaire({
      personneId: carte.personneId,
      activiteId: carte.activiteId,
      typeDocumentCode: carte.typeDocumentCode,
      dateDelivrance: carte.dateDelivrance,
      dateExpiration: carte.dateExpiration,
      communeDelivrance: carte.communeDelivrance,
      autoriteDelivrante: carte.autoriteDelivrante,
      observations: carte.observations,
      statut: carte.statut,
    });

    setCarteEnModification(carte.id);
    setCarteConsultee(null);
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
    nouveauStatut: StatutCarte,
  ) {
    const maintenant = new Date().toISOString();

    setCartes((anciennesCartes) =>
      anciennesCartes.map((carte) =>
        carte.id === id
          ? {
              ...carte,
              statut: nouveauStatut,
              updatedAt: maintenant,
            }
          : carte,
      ),
    );

    setCarteConsultee((ancienneCarte) =>
      ancienneCarte?.id === id
        ? {
            ...ancienneCarte,
            statut: nouveauStatut,
            updatedAt: maintenant,
          }
        : ancienneCarte,
    );

    setMessage(
      `Le statut du document est maintenant « ${nouveauStatut} ».`,
    );
  }

  function revoquerCarte(carte: CarteProvinciale) {
    const confirmation = window.confirm(
      `Voulez-vous vraiment révoquer le document ${carte.numeroDocument} ?`,
    );

    if (!confirmation) {
      return;
    }

    changerStatut(carte.id, "Révoqué");
  }

  function supprimerBrouillon(carte: CarteProvinciale) {
    if (carte.statut !== "Brouillon") {
      setErreur(
        "Seuls les documents en brouillon peuvent être supprimés.",
      );
      return;
    }

    const confirmation = window.confirm(
      `Voulez-vous supprimer le brouillon ${carte.numeroDocument} ?`,
    );

    if (!confirmation) {
      return;
    }

    setCartes((anciennesCartes) =>
      anciennesCartes.filter(
        (element) => element.id !== carte.id,
      ),
    );

    setCarteConsultee(null);
    setMessage("Le brouillon a été supprimé.");
  }

  function renouvelerCarte(carte: CarteProvinciale) {
    const typeDocument =
      typesDocuments.find(
        (element) =>
          element.code === carte.typeDocumentCode,
      ) || typesDocuments[0];

    const dateDelivrance = obtenirDateAujourdhui();

    setFormulaire({
      personneId: carte.personneId,
      activiteId: carte.activiteId,
      typeDocumentCode: carte.typeDocumentCode,
      dateDelivrance,
      dateExpiration: ajouterMois(
        dateDelivrance,
        typeDocument.dureeMois,
      ),
      communeDelivrance: carte.communeDelivrance,
      autoriteDelivrante: carte.autoriteDelivrante,
      observations: `Renouvellement du document ${carte.numeroDocument}`,
      statut: "Brouillon",
    });

    setCarteEnModification(null);
    setCarteConsultee(null);
    setFormulaireVisible(true);
    setErreur("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function obtenirStyleStatut(statut: StatutCarte) {
    if (statut === "Valide") {
      return "bg-green-100 text-green-800";
    }

    if (statut === "Brouillon") {
      return "bg-orange-100 text-orange-800";
    }

    if (statut === "Expiré") {
      return "bg-purple-100 text-purple-800";
    }

    if (statut === "Suspendu") {
      return "bg-yellow-100 text-yellow-800";
    }

    return "bg-red-100 text-red-800";
  }

  async function imprimerCarte(carte: CarteProvinciale) {
    const personne = trouverPersonne(carte.personneId);

    const fenetreImpression = window.open(
      "",
      "_blank",
      "width=1000,height=760",
    );

    if (!fenetreImpression) {
      setErreur(
        "Le navigateur a bloqué la fenêtre d’impression.",
      );
      return;
    }

    const adresseVerification =
      `${window.location.origin}/verification?numero=` +
      encodeURIComponent(carte.numeroDocument);

    let imageQr = "";

    try {
      imageQr = await QRCode.toDataURL(adresseVerification, {
        width: 260,
        margin: 1,
        errorCorrectionLevel: "H",
        color: {
          dark: "#111111",
          light: "#FFFFFF",
        },
      });
    } catch {
      fenetreImpression.close();
      setErreur(
        "Impossible de générer le QR code du document.",
      );
      return;
    }

    const photoValide =
      personne?.photo &&
      (personne.photo.startsWith("data:image/") ||
        personne.photo.startsWith("http"));

    const photoHtml = photoValide
      ? `<img src="${personne.photo}" alt="Photo" />`
      : `<div class="photo-placeholder">PHOTO</div>`;

    fenetreImpression.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <title>${echapperHtml(carte.numeroDocument)}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 40px;
              background: #eeeeee;
              color: #111111;
              font-family: Arial, Helvetica, sans-serif;
            }

            .page {
              width: 900px;
              margin: 0 auto;
            }

            .card {
              position: relative;
              overflow: hidden;
              min-height: 500px;
              border: 6px solid #111111;
              border-radius: 30px;
              background: #ffffff;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
            }

            .top {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 28px 34px;
              background: #ff6500;
            }

            .brand {
              display: flex;
              align-items: center;
              gap: 16px;
            }

            .logo {
              display: flex;
              width: 62px;
              height: 62px;
              align-items: center;
              justify-content: center;
              border-radius: 16px;
              background: #111111;
              color: #ffffff;
              font-weight: 900;
            }

            .brand h1 {
              margin: 0;
              font-size: 25px;
            }

            .brand p {
              margin: 5px 0 0;
              font-size: 13px;
              font-weight: 700;
            }

            .document-type {
              max-width: 360px;
              text-align: right;
              font-size: 22px;
              font-weight: 900;
            }

            .content {
              display: grid;
              grid-template-columns: 210px 1fr 130px;
              gap: 30px;
              padding: 38px;
            }

            .photo,
            .photo-placeholder {
              width: 210px;
              height: 255px;
              border-radius: 20px;
              object-fit: cover;
              background: #e5e5e5;
            }

            .photo-placeholder {
              display: flex;
              align-items: center;
              justify-content: center;
              color: #777777;
              font-size: 15px;
              font-weight: 900;
            }

            .label {
              margin-bottom: 6px;
              color: #777777;
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 1px;
              text-transform: uppercase;
            }

            .value {
              margin-bottom: 24px;
              font-size: 18px;
              font-weight: 900;
            }

            .name {
              font-size: 29px;
            }

            .qr {
              display: block;
              width: 125px;
              height: 125px;
              border: 1px solid #dddddd;
              border-radius: 18px;
              padding: 5px;
              background: #ffffff;
              object-fit: contain;
            }

            .status {
              margin-top: 18px;
              padding: 11px;
              border-radius: 999px;
              background: #d9fbe6;
              color: #087a41;
              text-align: center;
              font-size: 13px;
              font-weight: 900;
            }

            .footer {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 20px;
              border-top: 1px solid #dddddd;
              padding: 22px 34px;
              background: #fafafa;
              font-size: 13px;
              font-weight: 700;
            }

            .verification {
              color: #087a41;
              font-weight: 900;
            }

            @media print {
              body {
                padding: 0;
                background: #ffffff;
              }

              .page {
                width: 100%;
              }

              .card {
                box-shadow: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="page">
            <article class="card">
              <div class="top">
                <div class="brand">
                  <div class="logo">PC</div>

                  <div>
                    <h1>Province Connect</h1>
                    <p>Registre Provincial Numérique</p>
                  </div>
                </div>

                <div class="document-type">
                  ${echapperHtml(carte.typeDocumentNom)}
                </div>
              </div>

              <div class="content">
                <div>
                  ${photoHtml}
                </div>

                <div>
                  <div class="label">Titulaire</div>
                  <div class="value name">
                    ${echapperHtml(carte.titulaireNom)}
                  </div>

                  <div class="label">Numéro du document</div>
                  <div class="value">
                    ${echapperHtml(carte.numeroDocument)}
                  </div>

                  <div class="label">Catégorie</div>
                  <div class="value">
                    ${echapperHtml(carte.categorieDocument)}
                  </div>

                  ${
                    carte.activiteNom
                      ? `
                        <div class="label">Activité</div>
                        <div class="value">
                          ${echapperHtml(carte.activiteNom)}
                        </div>
                      `
                      : ""
                  }
                </div>

                <div>
                  <img
                    class="qr"
                    src="${imageQr}"
                    alt="QR code de vérification"
                  />

                  <div class="status">
                    ${echapperHtml(carte.statut)}
                  </div>
                </div>
              </div>

              <div class="footer">
                <span>
                  Délivré le ${echapperHtml(
                    formaterDate(carte.dateDelivrance),
                  )}
                </span>

                <span>
                  Expire le ${echapperHtml(
                    formaterDate(carte.dateExpiration),
                  )}
                </span>

                <span class="verification">
                  Document vérifiable
                </span>
              </div>
            </article>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    fenetreImpression.document.close();
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
                Cartes et permis provinciaux
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin/personnes"
              className="hidden rounded-xl border border-black/15 bg-white/30 px-4 py-2.5 text-sm font-extrabold text-black transition hover:bg-white/50 md:inline-flex"
            >
              Personnes
            </Link>

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
              Cartes et permis provinciaux
            </h1>

            <p className="mt-3 max-w-3xl leading-7 text-neutral-600">
              Créez et gérez les cartes professionnelles, permis,
              autorisations et documents provinciaux.
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
              : "+ Nouveau document"}
          </button>
        </section>

        {personnesDisponibles.length === 0 && (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-extrabold text-orange-900">
                Aucun titulaire disponible
              </p>

              <p className="mt-1 text-sm leading-6 text-orange-800">
                Enregistrez d’abord une personne avant de créer une
                carte ou un permis.
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
              titre: "Total des documents",
              valeur: statistiques.total,
              couleur: "text-black",
            },
            {
              titre: "Documents valides",
              valeur: statistiques.valides,
              couleur: "text-green-700",
            },
            {
              titre: "Brouillons",
              valeur: statistiques.brouillons,
              couleur: "text-orange-600",
            },
            {
              titre: "Suspendus ou révoqués",
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
                Production du document
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {carteEnModification
                  ? "Modifier le document"
                  : "Créer une carte ou un permis"}
              </h2>
            </div>

            <form
              onSubmit={enregistrerCarte}
              className="grid gap-7 p-6 xl:grid-cols-[1fr_500px]"
            >
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="titulaire"
                    className="mb-2 block text-sm font-extrabold text-black"
                  >
                    Titulaire
                  </label>

                  <select
                    id="titulaire"
                    value={formulaire.personneId}
                    onChange={(event) =>
                      choisirPersonne(event.target.value)
                    }
                    className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="">
                      Sélectionner une personne
                    </option>

                    {personnesDisponibles.map((personne) => (
                      <option
                        key={personne.id}
                        value={personne.id}
                      >
                        {personne.nomComplet} — {personne.numero}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="type-document"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Type de document
                    </label>

                    <select
                      id="type-document"
                      value={formulaire.typeDocumentCode}
                      onChange={(event) =>
                        choisirTypeDocument(event.target.value)
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      {typesDocuments.map((typeDocument) => (
                        <option
                          key={typeDocument.code}
                          value={typeDocument.code}
                        >
                          {typeDocument.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="activite"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Activité liée
                      {typeDocumentSelectionne.activiteObligatoire
                        ? " *"
                        : " — facultatif"}
                    </label>

                    <select
                      id="activite"
                      value={formulaire.activiteId}
                      onChange={(event) =>
                        choisirActivite(event.target.value)
                      }
                      disabled={!formulaire.personneId}
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">
                        {formulaire.personneId
                          ? "Sélectionner une activité"
                          : "Choisissez d’abord le titulaire"}
                      </option>

                      {activitesDeLaPersonne.map((activite) => (
                        <option
                          key={activite.id}
                          value={activite.id}
                        >
                          {activite.nomActivite} — {activite.numero}
                        </option>
                      ))}
                    </select>

                    {formulaire.personneId &&
                      typeDocumentSelectionne.activiteObligatoire &&
                      activitesDeLaPersonne.length === 0 && (
                        <p className="mt-2 text-sm font-semibold text-red-700">
                          Ce titulaire ne possède aucune activité
                          disponible.
                        </p>
                      )}
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label
                      htmlFor="date-delivrance"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Date de délivrance
                    </label>

                    <input
                      id="date-delivrance"
                      type="date"
                      value={formulaire.dateDelivrance}
                      onChange={(event) =>
                        modifierDateDelivrance(event.target.value)
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="date-expiration"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Date d’expiration
                    </label>

                    <input
                      id="date-expiration"
                      type="date"
                      value={formulaire.dateExpiration}
                      onChange={(event) =>
                        modifierChamp(
                          "dateExpiration",
                          event.target.value,
                        )
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="statut-document"
                      className="mb-2 block text-sm font-extrabold text-black"
                    >
                      Statut
                    </label>

                    <select
                      id="statut-document"
                      value={formulaire.statut}
                      onChange={(event) =>
                        modifierChamp(
                          "statut",
                          event.target.value as StatutCarte,
                        )
                      }
                      className="min-h-14 w-full rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="Brouillon">Brouillon</option>
                      <option value="Valide">Valide</option>
                      <option value="Suspendu">Suspendu</option>
                      <option value="Expiré">Expiré</option>
                      <option value="Révoqué">Révoqué</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <ChampTexte
                    id="commune-delivrance"
                    label="Commune de délivrance"
                    value={formulaire.communeDelivrance}
                    placeholder="Exemple : Ibanda"
                    onChange={(valeur) =>
                      modifierChamp(
                        "communeDelivrance",
                        valeur,
                      )
                    }
                  />

                  <ChampTexte
                    id="autorite-delivrante"
                    label="Autorité de délivrance"
                    value={formulaire.autoriteDelivrante}
                    placeholder="Service ou autorité responsable"
                    onChange={(valeur) =>
                      modifierChamp(
                        "autoriteDelivrante",
                        valeur,
                      )
                    }
                  />
                </div>

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
                    placeholder="Informations complémentaires, restriction ou précision..."
                    className="min-h-28 w-full resize-y rounded-xl border border-black/15 bg-neutral-50 px-4 py-3 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-black/10 pt-6 sm:flex-row">
                  <button
                    type="submit"
                    className="min-h-14 rounded-xl bg-orange-500 px-7 font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                  >
                    {carteEnModification
                      ? "Enregistrer les modifications"
                      : "Créer le document"}
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
                  Aperçu du document
                </p>

                <ApercuCarte
                  typeDocument={typeDocumentSelectionne.nom}
                  categorie={typeDocumentSelectionne.categorie}
                  titulaire={
                    personneSelectionnee?.nomComplet ||
                    "Nom du titulaire"
                  }
                  numero={
                    carteEnModification
                      ? cartes.find(
                          (carte) =>
                            carte.id === carteEnModification,
                        )?.numeroDocument || "Numéro automatique"
                      : `PC-${typeDocumentSelectionne.code}-2026-XXXXXX`
                  }
                  activite={
                    activiteSelectionnee?.nomActivite || ""
                  }
                  statut={formulaire.statut}
                  dateExpiration={formulaire.dateExpiration}
                  photo={personneSelectionnee?.photo || ""}
                />

                <div className="mt-5 rounded-2xl bg-neutral-100 p-4">
                  <p className="text-sm font-extrabold text-black">
                    Durée proposée
                  </p>

                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    {typeDocumentSelectionne.dureeMois} mois. La
                    date d’expiration reste modifiable par
                    l’administration.
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm font-extrabold text-orange-900">
                    QR code
                  </p>

                  <p className="mt-2 text-sm leading-6 text-orange-800">
                    Le QR code ouvre directement la page publique de
                    vérification du document après sa création.
                  </p>
                </div>
              </aside>
            </form>
          </section>
        )}

        {/* Recherche */}
        <section className="mt-7 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_240px_220px]">
            <input
              type="search"
              value={recherche}
              onChange={(event) =>
                setRecherche(event.target.value)
              }
              placeholder="Rechercher par numéro, titulaire, activité ou document..."
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />

            <select
              value={filtreType}
              onChange={(event) =>
                setFiltreType(event.target.value)
              }
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="Tous">Tous les documents</option>

              {typesDocuments.map((typeDocument) => (
                <option
                  key={typeDocument.code}
                  value={typeDocument.code}
                >
                  {typeDocument.nom}
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
              <option value="Brouillon">Brouillons</option>
              <option value="Valide">Valides</option>
              <option value="Expiré">Expirés</option>
              <option value="Suspendu">Suspendus</option>
              <option value="Révoqué">Révoqués</option>
            </select>
          </div>
        </section>

        {/* Liste */}
        <section className="mt-7">
          {cartesFiltrees.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 font-black text-neutral-500">
                CAR
              </div>

              <h2 className="mt-5 text-xl font-black text-black">
                Aucun document créé
              </h2>

              <p className="mx-auto mt-3 max-w-lg leading-7 text-neutral-500">
                Utilisez le bouton « Nouveau document » pour créer
                la première carte ou le premier permis.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] border-collapse text-left">
                  <thead className="bg-neutral-50">
                    <tr className="text-xs uppercase tracking-wider text-neutral-500">
                      <th className="px-5 py-4 font-black">
                        Titulaire
                      </th>
                      <th className="px-5 py-4 font-black">
                        Numéro
                      </th>
                      <th className="px-5 py-4 font-black">
                        Document
                      </th>
                      <th className="px-5 py-4 font-black">
                        Délivrance
                      </th>
                      <th className="px-5 py-4 font-black">
                        Expiration
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
                    {cartesFiltrees.map((carte) => {
                      const personne = trouverPersonne(
                        carte.personneId,
                      );

                      return (
                        <tr
                          key={carte.id}
                          className="border-t border-black/5 transition hover:bg-orange-50/40"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {personne?.photo ? (
                                <img
                                  src={personne.photo}
                                  alt={carte.titulaireNom}
                                  className="h-12 w-12 rounded-xl object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-xs font-black text-white">
                                  PC
                                </div>
                              )}

                              <div>
                                <p className="font-extrabold text-black">
                                  {carte.titulaireNom}
                                </p>

                                <p className="mt-1 text-xs text-neutral-500">
                                  {carte.titulaireNumero}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm font-extrabold text-black">
                            {carte.numeroDocument}
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-neutral-700">
                              {carte.typeDocumentNom}
                            </p>

                            {carte.activiteNom && (
                              <p className="mt-1 text-xs text-neutral-500">
                                {carte.activiteNom}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-neutral-600">
                            {formaterDate(carte.dateDelivrance)}
                          </td>

                          <td className="px-5 py-4 text-sm text-neutral-600">
                            {formaterDate(carte.dateExpiration)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold ${obtenirStyleStatut(
                                carte.statut,
                              )}`}
                            >
                              {carte.statut}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setCarteConsultee(carte)
                                }
                                className="rounded-lg bg-black px-3 py-2 text-xs font-extrabold text-white transition hover:bg-green-800"
                              >
                                Consulter
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  modifierCarte(carte)
                                }
                                className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-700 transition hover:bg-orange-100"
                              >
                                Modifier
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  imprimerCarte(carte)
                                }
                                className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-extrabold text-green-700 transition hover:bg-green-100"
                              >
                                Imprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Consultation */}
      {carteConsultee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="my-8 w-full max-w-5xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-5 bg-black px-6 py-5 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                  Document provincial
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {carteConsultee.numeroDocument}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setCarteConsultee(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl transition hover:bg-white/20"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="grid gap-7 p-6 lg:grid-cols-[1.1fr_0.9fr]">
              <ApercuCarte
                typeDocument={carteConsultee.typeDocumentNom}
                categorie={carteConsultee.categorieDocument}
                titulaire={carteConsultee.titulaireNom}
                numero={carteConsultee.numeroDocument}
                activite={carteConsultee.activiteNom}
                statut={carteConsultee.statut}
                dateExpiration={carteConsultee.dateExpiration}
                photo={
                  trouverPersonne(carteConsultee.personneId)
                    ?.photo || ""
                }
              />

              <div className="grid content-start gap-5 sm:grid-cols-2">
                <Information
                  label="Titulaire"
                  valeur={carteConsultee.titulaireNom}
                />

                <Information
                  label="Numéro du titulaire"
                  valeur={carteConsultee.titulaireNumero}
                />

                <Information
                  label="Document"
                  valeur={carteConsultee.typeDocumentNom}
                />

                <Information
                  label="Catégorie"
                  valeur={carteConsultee.categorieDocument}
                />

                <Information
                  label="Activité"
                  valeur={
                    carteConsultee.activiteNom ||
                    "Aucune activité liée"
                  }
                />

                <Information
                  label="Statut"
                  valeur={carteConsultee.statut}
                />

                <Information
                  label="Délivré le"
                  valeur={formaterDate(
                    carteConsultee.dateDelivrance,
                  )}
                />

                <Information
                  label="Expiration"
                  valeur={formaterDate(
                    carteConsultee.dateExpiration,
                  )}
                />

                <Information
                  label="Commune de délivrance"
                  valeur={carteConsultee.communeDelivrance}
                />

                <Information
                  label="Autorité"
                  valeur={carteConsultee.autoriteDelivrante}
                />
              </div>
            </div>

            <div className="border-t border-black/10 px-6 py-5">
              <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                Observations
              </p>

              <p className="mt-2 leading-7 text-neutral-700">
                {carteConsultee.observations ||
                  "Aucune observation ajoutée."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    imprimerCarte(carteConsultee)
                  }
                  className="rounded-xl bg-black px-5 py-3 text-sm font-extrabold text-white transition hover:bg-green-800"
                >
                  Imprimer le document
                </button>

                <button
                  type="button"
                  onClick={() =>
                    modifierCarte(carteConsultee)
                  }
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-orange-600"
                >
                  Modifier
                </button>

                {carteConsultee.statut === "Brouillon" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        changerStatut(
                          carteConsultee.id,
                          "Valide",
                        )
                      }
                      className="rounded-xl bg-green-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-green-800"
                    >
                      Activer le document
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        supprimerBrouillon(carteConsultee)
                      }
                      className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                    >
                      Supprimer le brouillon
                    </button>
                  </>
                )}

                {carteConsultee.statut === "Valide" && (
                  <button
                    type="button"
                    onClick={() =>
                      changerStatut(
                        carteConsultee.id,
                        "Suspendu",
                      )
                    }
                    className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-extrabold text-black transition hover:bg-yellow-600"
                  >
                    Suspendre
                  </button>
                )}

                {carteConsultee.statut === "Suspendu" && (
                  <button
                    type="button"
                    onClick={() =>
                      changerStatut(
                        carteConsultee.id,
                        "Valide",
                      )
                    }
                    className="rounded-xl bg-green-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-green-800"
                  >
                    Réactiver
                  </button>
                )}

                {(carteConsultee.statut === "Expiré" ||
                  carteConsultee.statut === "Révoqué") && (
                  <button
                    type="button"
                    onClick={() =>
                      renouvelerCarte(carteConsultee)
                    }
                    className="rounded-xl bg-green-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-green-800"
                  >
                    Préparer le renouvellement
                  </button>
                )}

                {carteConsultee.statut !== "Révoqué" &&
                  carteConsultee.statut !== "Brouillon" && (
                    <button
                      type="button"
                      onClick={() =>
                        revoquerCarte(carteConsultee)
                      }
                      className="rounded-xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-red-700"
                    >
                      Révoquer
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

type ApercuCarteProps = {
  typeDocument: string;
  categorie: string;
  titulaire: string;
  numero: string;
  activite: string;
  statut: StatutCarte;
  dateExpiration: string;
  photo: string;
};

function ApercuCarte({
  typeDocument,
  categorie,
  titulaire,
  numero,
  activite,
  statut,
  dateExpiration,
  photo,
}: ApercuCarteProps) {
  const [adresseVerification, setAdresseVerification] =
    useState("");

  useEffect(() => {
    const numeroEstValide =
      numero.startsWith("PC-") &&
      !numero.includes("XXXXXX") &&
      !numero.toLowerCase().includes("automatique");

    if (!numeroEstValide) {
      setAdresseVerification("");
      return;
    }

    setAdresseVerification(
      `${window.location.origin}/verification?numero=${encodeURIComponent(
        numero,
      )}`,
    );
  }, [numero]);

  function obtenirCouleurStatut() {
    if (statut === "Valide") {
      return "bg-green-100 text-green-800";
    }

    if (statut === "Brouillon") {
      return "bg-orange-100 text-orange-800";
    }

    if (statut === "Suspendu") {
      return "bg-yellow-100 text-yellow-800";
    }

    return "bg-red-100 text-red-800";
  }

  return (
    <article className="overflow-hidden rounded-[28px] border-4 border-black bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-5 bg-orange-500 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-xs font-black text-white">
            PC
          </div>

          <div>
            <p className="font-black text-black">
              Province Connect
            </p>

            <p className="text-xs font-semibold text-black/65">
              Registre Provincial Numérique
            </p>
          </div>
        </div>

        <div className="max-w-[210px] text-right">
          <p className="text-xs font-black uppercase tracking-wider text-black/65">
            Document provincial
          </p>

          <p className="mt-1 font-black leading-tight text-black">
            {typeDocument}
          </p>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[115px_1fr_80px]">
        {photo ? (
          <img
            src={photo}
            alt={titulaire}
            className="h-36 w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-36 items-center justify-center rounded-2xl bg-neutral-200 text-xs font-black text-neutral-500">
            PHOTO
          </div>
        )}

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Titulaire
          </p>

          <p className="mt-1 truncate text-lg font-black text-black">
            {titulaire}
          </p>

          <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Numéro
          </p>

          <p className="mt-1 break-all text-sm font-extrabold text-black">
            {numero}
          </p>

          <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Catégorie
          </p>

          <p className="mt-1 text-sm font-bold text-neutral-700">
            {categorie}
          </p>

          {activite && (
            <>
              <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Activité
              </p>

              <p className="mt-1 truncate text-sm font-bold text-neutral-700">
                {activite}
              </p>
            </>
          )}
        </div>

        <div>
          {adresseVerification ? (
            <QrCodeImage
              valeur={adresseVerification}
              taille={80}
              alt={`QR code de vérification du document ${numero}`}
              className="h-20 w-20 border border-black/10"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-black px-2 text-center text-[10px] font-black leading-4 text-white">
              QR après création
            </div>
          )}

          <span
            className={`mt-3 inline-flex w-full justify-center rounded-full px-2 py-2 text-[10px] font-black ${obtenirCouleurStatut()}`}
          >
            {statut}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-black/10 bg-neutral-50 px-5 py-4 text-xs font-bold text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Expiration : {formaterDate(dateExpiration)}
        </span>

        <span className="text-green-700">
          {adresseVerification
            ? "QR de vérification actif"
            : "Document non créé"}
        </span>
      </div>
    </article>
  );
}

type QrCodeImageProps = {
  valeur: string;
  taille?: number;
  className?: string;
  alt?: string;
};

function QrCodeImage({
  valeur,
  taille = 180,
  className = "",
  alt = "QR code de vérification",
}: QrCodeImageProps) {
  const [imageQr, setImageQr] = useState("");
  const [erreurQr, setErreurQr] = useState(false);

  useEffect(() => {
    let composantActif = true;

    async function genererQrCode() {
      if (!valeur.trim()) {
        setImageQr("");
        setErreurQr(false);
        return;
      }

      try {
        const imageGeneree = await QRCode.toDataURL(valeur, {
          width: taille,
          margin: 1,
          errorCorrectionLevel: "H",
          color: {
            dark: "#111111",
            light: "#FFFFFF",
          },
        });

        if (composantActif) {
          setImageQr(imageGeneree);
          setErreurQr(false);
        }
      } catch {
        if (composantActif) {
          setImageQr("");
          setErreurQr(true);
        }
      }
    }

    genererQrCode();

    return () => {
      composantActif = false;
    };
  }, [valeur, taille]);

  if (erreurQr) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-red-50 px-2 text-center text-xs font-extrabold text-red-700 ${className}`}
        style={{ width: taille, height: taille }}
      >
        QR indisponible
      </div>
    );
  }

  if (!imageQr) {
    return (
      <div
        className={`flex animate-pulse items-center justify-center rounded-xl bg-neutral-200 px-2 text-center text-xs font-extrabold text-neutral-500 ${className}`}
        style={{ width: taille, height: taille }}
      >
        Génération…
      </div>
    );
  }

  return (
    <img
      src={imageQr}
      alt={alt}
      width={taille}
      height={taille}
      className={`rounded-xl bg-white object-contain ${className}`}
    />
  );
}



