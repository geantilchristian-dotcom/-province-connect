"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useSupabaseCollection } from "../../../lib/data/useSupabaseCollection";

type Devise = "CDF" | "USD";

type StatutPaiement =
  | "Payé"
  | "Partiel"
  | "Annulé"
  | "Remboursé";

type StatutRecu =
  | "Valide"
  | "Paiement partiel"
  | "Annulé"
  | "Remboursé";

type FormatImpression = "A4" | "80mm";

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

const CLE_PAIEMENTS = "province-connect-paiements";
const CLE_RECUS = "province-connect-recus";

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

function obtenirStatutRecu(
  statutPaiement: StatutPaiement,
): StatutRecu {
  if (statutPaiement === "Payé") {
    return "Valide";
  }

  if (statutPaiement === "Partiel") {
    return "Paiement partiel";
  }

  if (statutPaiement === "Remboursé") {
    return "Remboursé";
  }

  return "Annulé";
}

function echapperHtml(texte: string) {
  return String(texte)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function creerCodeVerification(
  paiementId: string,
  numeroRecu: string,
) {
  const texte = `${paiementId}-${numeroRecu}`;
  let valeur = 0;

  for (let index = 0; index < texte.length; index += 1) {
    valeur = (valeur * 31 + texte.charCodeAt(index)) >>> 0;
  }

  return `VR-${valeur
    .toString(36)
    .toUpperCase()
    .padStart(8, "0")
    .slice(0, 8)}`;
}

function genererNumeroRecu(
  paiement: PaiementProvincial,
  numerosUtilises: Set<string>,
) {
  const correspondance = paiement.numero.match(
    /^PC-PAY-(\d{4})-(\d{6})$/,
  );

  if (correspondance) {
    const numeroPropose =
      `PC-REC-${correspondance[1]}-${correspondance[2]}`;

    if (!numerosUtilises.has(numeroPropose)) {
      return numeroPropose;
    }
  }

  const annee = new Date().getFullYear();

  let plusGrandNumero = 0;

  numerosUtilises.forEach((numero) => {
    const parties = numero.split("-");
    const dernierePartie = Number(parties.at(-1));

    if (Number.isFinite(dernierePartie)) {
      plusGrandNumero = Math.max(
        plusGrandNumero,
        dernierePartie,
      );
    }
  });

  return `PC-REC-${annee}-${String(
    plusGrandNumero + 1,
  ).padStart(6, "0")}`;
}

function synchroniserRecus(
  paiements: PaiementProvincial[],
  recusExistants: RecuNumerique[],
) {
  const maintenant = new Date().toISOString();

  const numerosUtilises = new Set(
    recusExistants.map((recu) => recu.numeroRecu),
  );

  const recusSynchronises: RecuNumerique[] = [];

  paiements.forEach((paiement) => {
    const recuExistant =
      recusExistants.find(
        (recu) => recu.paiementId === paiement.id,
      ) || null;

    let numeroRecu = recuExistant?.numeroRecu || "";

    if (!numeroRecu) {
      numeroRecu = genererNumeroRecu(
        paiement,
        numerosUtilises,
      );

      numerosUtilises.add(numeroRecu);
    }

    const statut = obtenirStatutRecu(paiement.statut);

    const recuSynchronise: RecuNumerique = {
      id: recuExistant?.id || crypto.randomUUID(),

      numeroRecu,

      codeVerification:
        recuExistant?.codeVerification ||
        creerCodeVerification(
          paiement.id,
          numeroRecu,
        ),

      paiementId: paiement.id,
      numeroPaiement: paiement.numero,

      personneId: paiement.personneId,
      payeurNom: paiement.payeurNom,
      payeurNumero: paiement.payeurNumero,

      activiteId: paiement.activiteId,
      activiteNom: paiement.activiteNom,
      activiteNumero: paiement.activiteNumero,

      taxeId: paiement.taxeId,
      taxeNumero: paiement.taxeNumero,
      taxeNom: paiement.taxeNom,
      taxeCategorie: paiement.taxeCategorie,
      taxeFrequence: paiement.taxeFrequence,

      montantDu: paiement.montantDu,
      montantPaye: paiement.montantPaye,

      resteAPayer: Math.max(
        paiement.montantDu - paiement.montantPaye,
        0,
      ),

      devise: paiement.devise,

      modePaiement: paiement.modePaiement,

      referenceTransaction:
        paiement.referenceTransaction,

      datePaiement: paiement.datePaiement,

      dateEmission:
        recuExistant?.dateEmission ||
        paiement.datePaiement,

      periodeConcernee:
        paiement.periodeConcernee,

      agentEncaisseur:
        paiement.agentEncaisseur,

      bureauEncaissement:
        paiement.bureauEncaissement,

      observations: paiement.observations,

      statut,

      createdAt:
        recuExistant?.createdAt || maintenant,

      updatedAt: maintenant,
    };

    recusSynchronises.push(recuSynchronise);
  });

  return recusSynchronises.sort(
    (premier, deuxieme) =>
      new Date(deuxieme.createdAt).getTime() -
      new Date(premier.createdAt).getTime(),
  );
}

function obtenirStyleStatut(statut: StatutRecu) {
  if (statut === "Valide") {
    return "bg-green-100 text-green-800";
  }

  if (statut === "Paiement partiel") {
    return "bg-orange-100 text-orange-800";
  }

  if (statut === "Remboursé") {
    return "bg-purple-100 text-purple-800";
  }

  return "bg-red-100 text-red-800";
}

export default function AdminRecusPage() {
  const [paiements, setPaiements] = useState<
    PaiementProvincial[]
  >([]);

  const [recus, setRecus] = useState<RecuNumerique[]>([]);
  const [paiementsPrets, setPaiementsPrets] = useState(false);
  const [recusPrets, setRecusPrets] = useState(false);
  const derniereSignaturePaiements = useRef("");

  const [recuConsulte, setRecuConsulte] =
    useState<RecuNumerique | null>(null);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] =
    useState("Tous");
  const [filtreDevise, setFiltreDevise] =
    useState("Toutes");
  const [filtreMode, setFiltreMode] =
    useState("Tous");

  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  useSupabaseCollection({
    table: "paiements",
    items: paiements,
    setItems: setPaiements,
    readOnly: true,
    onReadyChange: setPaiementsPrets,
    onError: setErreur,
  });

  useSupabaseCollection({
    table: "recus",
    items: recus,
    setItems: setRecus,
    localStorageKey: CLE_RECUS,
    onReadyChange: setRecusPrets,
    onError: setErreur,
  });

  useEffect(() => {
    if (!paiementsPrets || !recusPrets) {
      return;
    }

    if (paiements.length === 0) {
      return;
    }

    const signature = JSON.stringify(paiements);

    if (derniereSignaturePaiements.current === signature) {
      return;
    }

    derniereSignaturePaiements.current = signature;

    setRecus((recusActuels) =>
      synchroniserRecus(paiements, recusActuels),
    );
  }, [paiements, paiementsPrets, recusPrets]);

  const modesPaiementDisponibles = useMemo(() => {
    return Array.from(
      new Set(
        recus
          .map((recu) => recu.modePaiement)
          .filter(Boolean),
      ),
    ).sort((premier, deuxieme) =>
      premier.localeCompare(deuxieme, "fr"),
    );
  }, [recus]);

  const statistiques = useMemo(() => {
    const recusComptabilises = recus.filter(
      (recu) =>
        recu.statut === "Valide" ||
        recu.statut === "Paiement partiel",
    );

    return {
      total: recus.length,

      valides: recus.filter(
        (recu) => recu.statut === "Valide",
      ).length,

      partiels: recus.filter(
        (recu) =>
          recu.statut === "Paiement partiel",
      ).length,

      totalCDF: recusComptabilises
        .filter((recu) => recu.devise === "CDF")
        .reduce(
          (total, recu) =>
            total + recu.montantPaye,
          0,
        ),

      totalUSD: recusComptabilises
        .filter((recu) => recu.devise === "USD")
        .reduce(
          (total, recu) =>
            total + recu.montantPaye,
          0,
        ),
    };
  }, [recus]);

  const recusFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return recus.filter((recu) => {
      const correspondRecherche =
        !terme ||
        recu.numeroRecu
          .toLowerCase()
          .includes(terme) ||
        recu.numeroPaiement
          .toLowerCase()
          .includes(terme) ||
        recu.codeVerification
          .toLowerCase()
          .includes(terme) ||
        recu.payeurNom
          .toLowerCase()
          .includes(terme) ||
        recu.payeurNumero
          .toLowerCase()
          .includes(terme) ||
        recu.taxeNom
          .toLowerCase()
          .includes(terme) ||
        recu.activiteNom
          .toLowerCase()
          .includes(terme) ||
        recu.referenceTransaction
          .toLowerCase()
          .includes(terme);

      const correspondStatut =
        filtreStatut === "Tous" ||
        recu.statut === filtreStatut;

      const correspondDevise =
        filtreDevise === "Toutes" ||
        recu.devise === filtreDevise;

      const correspondMode =
        filtreMode === "Tous" ||
        recu.modePaiement === filtreMode;

      return (
        correspondRecherche &&
        correspondStatut &&
        correspondDevise &&
        correspondMode
      );
    });
  }, [
    recus,
    recherche,
    filtreStatut,
    filtreDevise,
    filtreMode,
  ]);

  function actualiserRecus() {
    setErreur("");
    setMessage("");

    const recusSynchronises = synchroniserRecus(
      paiements,
      recus,
    );

    setRecus(recusSynchronises);

    setRecuConsulte((ancienRecu) => {
      if (!ancienRecu) {
        return null;
      }

      return (
        recusSynchronises.find(
          (recu) => recu.id === ancienRecu.id,
        ) || null
      );
    });

    setMessage(
      `${recusSynchronises.length} reçu(s) synchronisé(s) avec les paiements Supabase.`,
    );
  }

  async function copierTexte(
    texte: string,
    messageSucces: string,
  ) {
    try {
      await navigator.clipboard.writeText(texte);
      setMessage(messageSucces);
      setErreur("");
    } catch {
      setErreur(
        "Impossible de copier automatiquement le texte.",
      );
    }
  }

  function imprimerRecu(
    recu: RecuNumerique,
    format: FormatImpression,
  ) {
    const fenetreImpression = window.open(
      "",
      "_blank",
      format === "80mm"
        ? "width=450,height=760"
        : "width=1000,height=850",
    );

    if (!fenetreImpression) {
      setErreur(
        "Le navigateur a bloqué la fenêtre d’impression.",
      );
      return;
    }

    const recuInvalide =
      recu.statut === "Annulé" ||
      recu.statut === "Remboursé";

    const formatTicket = format === "80mm";

    const largeurPage = formatTicket
      ? "80mm"
      : "210mm";

    const margePage = formatTicket
      ? "0"
      : "14mm";

    const largeurContenu = formatTicket
      ? "80mm"
      : "180mm";

    const tailleTitre = formatTicket
      ? "18px"
      : "30px";

    const montantTaille = formatTicket
      ? "25px"
      : "38px";

    fenetreImpression.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />

          <title>
            ${echapperHtml(recu.numeroRecu)}
          </title>

          <style>
            @page {
              size: ${formatTicket ? "80mm auto" : "A4"};
              margin: ${margePage};
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: ${formatTicket ? "7mm 4mm" : "25px"};
              background: #eeeeee;
              color: #111111;
              font-family: Arial, Helvetica, sans-serif;
            }

            .page {
              position: relative;
              width: ${largeurContenu};
              max-width: 100%;
              margin: 0 auto;
              overflow: hidden;
              border: ${formatTicket
                ? "1px dashed #999999"
                : "3px solid #111111"};
              border-radius: ${formatTicket
                ? "0"
                : "24px"};
              background: #ffffff;
              box-shadow: ${formatTicket
                ? "none"
                : "0 20px 60px rgba(0, 0, 0, 0.15)"};
            }

            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 15px;
              padding: ${formatTicket
                ? "14px 12px"
                : "25px 28px"};
              background: #ff6500;
            }

            .brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .logo {
              display: flex;
              width: ${formatTicket ? "42px" : "58px"};
              height: ${formatTicket ? "42px" : "58px"};
              align-items: center;
              justify-content: center;
              border-radius: 12px;
              background: #111111;
              color: #ffffff;
              font-size: ${formatTicket ? "11px" : "14px"};
              font-weight: 900;
            }

            .brand-name {
              margin: 0;
              font-size: ${formatTicket ? "15px" : "21px"};
              font-weight: 900;
            }

            .brand-subtitle {
              margin: 4px 0 0;
              font-size: ${formatTicket ? "8px" : "11px"};
              font-weight: 700;
            }

            .receipt-title {
              text-align: right;
            }

            .receipt-title strong {
              display: block;
              font-size: ${tailleTitre};
              font-weight: 900;
            }

            .receipt-title span {
              display: block;
              margin-top: 4px;
              font-size: ${formatTicket ? "9px" : "12px"};
              font-weight: 700;
            }

            .body {
              padding: ${formatTicket
                ? "17px 12px"
                : "30px"};
            }

            .status-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 15px;
              border-bottom: 1px solid #dddddd;
              padding-bottom: 18px;
            }

            .number-label,
            .label {
              color: #777777;
              font-size: ${formatTicket ? "8px" : "10px"};
              font-weight: 900;
              letter-spacing: 1px;
              text-transform: uppercase;
            }

            .number {
              margin-top: 6px;
              font-size: ${formatTicket ? "14px" : "23px"};
              font-weight: 900;
              word-break: break-word;
            }

            .status {
              border-radius: 999px;
              padding: 8px 12px;
              background: ${
                recu.statut === "Valide"
                  ? "#dcfce7"
                  : recu.statut === "Paiement partiel"
                    ? "#ffedd5"
                    : recu.statut === "Remboursé"
                      ? "#f3e8ff"
                      : "#fee2e2"
              };
              color: ${
                recu.statut === "Valide"
                  ? "#166534"
                  : recu.statut === "Paiement partiel"
                    ? "#9a3412"
                    : recu.statut === "Remboursé"
                      ? "#6b21a8"
                      : "#991b1b"
              };
              font-size: ${formatTicket ? "9px" : "12px"};
              font-weight: 900;
              text-align: center;
            }

            .amount-box {
              margin-top: 22px;
              border-radius: ${formatTicket ? "8px" : "18px"};
              padding: ${formatTicket
                ? "14px 11px"
                : "23px"};
              background: #f0fdf4;
            }

            .amount {
              margin-top: 6px;
              color: #166534;
              font-size: ${montantTaille};
              font-weight: 900;
            }

            .grid {
              display: grid;
              grid-template-columns: ${
                formatTicket ? "1fr" : "repeat(2, 1fr)"
              };
              gap: ${formatTicket ? "13px" : "18px"};
              margin-top: 24px;
            }

            .item {
              border-bottom: 1px solid #eeeeee;
              padding-bottom: 10px;
            }

            .value {
              margin-top: 5px;
              font-size: ${formatTicket ? "11px" : "15px"};
              font-weight: 800;
              line-height: 1.45;
              word-break: break-word;
            }

            .verification {
              display: grid;
              grid-template-columns: ${
                formatTicket ? "1fr" : "1fr 105px"
              };
              gap: 18px;
              align-items: center;
              margin-top: 24px;
              border-top: 2px solid #111111;
              padding-top: 20px;
            }

            .verification-code {
              margin-top: 7px;
              font-size: ${formatTicket ? "15px" : "21px"};
              font-weight: 900;
              letter-spacing: 1px;
            }

            .qr {
              display: flex;
              width: ${formatTicket ? "85px" : "105px"};
              height: ${formatTicket ? "85px" : "105px"};
              align-items: center;
              justify-content: center;
              margin: ${formatTicket ? "0 auto" : "0"};
              border-radius: 14px;
              background: #111111;
              color: #ffffff;
              font-size: ${formatTicket ? "12px" : "16px"};
              font-weight: 900;
              text-align: center;
            }

            .footer {
              padding: ${formatTicket
                ? "14px 12px"
                : "20px 28px"};
              background: #111111;
              color: #ffffff;
              font-size: ${formatTicket ? "8px" : "11px"};
              line-height: 1.6;
              text-align: center;
            }

            .watermark {
              position: absolute;
              inset: 0;
              z-index: 10;
              display: ${
                recuInvalide ? "flex" : "none"
              };
              align-items: center;
              justify-content: center;
              pointer-events: none;
              color: rgba(190, 0, 0, 0.2);
              font-size: ${formatTicket ? "45px" : "90px"};
              font-weight: 900;
              transform: rotate(-28deg);
              text-transform: uppercase;
            }

            @media print {
              body {
                width: ${largeurPage};
                padding: 0;
                background: #ffffff;
              }

              .page {
                box-shadow: none;
              }
            }
          </style>
        </head>

        <body>
          <article class="page">
            <div class="watermark">
              ${echapperHtml(recu.statut)}
            </div>

            <header class="header">
              <div class="brand">
                <div class="logo">PC</div>

                <div>
                  <p class="brand-name">
                    Province Connect
                  </p>

                  <p class="brand-subtitle">
                    Registre Provincial Numérique
                  </p>
                </div>
              </div>

              <div class="receipt-title">
                <strong>REÇU</strong>
                <span>Original administratif</span>
              </div>
            </header>

            <div class="body">
              <div class="status-row">
                <div>
                  <div class="number-label">
                    Numéro du reçu
                  </div>

                  <div class="number">
                    ${echapperHtml(recu.numeroRecu)}
                  </div>
                </div>

                <div class="status">
                  ${echapperHtml(recu.statut)}
                </div>
              </div>

              <div class="amount-box">
                <div class="label">
                  Montant encaissé
                </div>

                <div class="amount">
                  ${echapperHtml(
                    formaterMontant(
                      recu.montantPaye,
                      recu.devise,
                    ),
                  )}
                </div>
              </div>

              <div class="grid">
                <div class="item">
                  <div class="label">Payeur</div>
                  <div class="value">
                    ${echapperHtml(recu.payeurNom)}
                  </div>
                </div>

                <div class="item">
                  <div class="label">
                    Numéro du payeur
                  </div>
                  <div class="value">
                    ${echapperHtml(recu.payeurNumero)}
                  </div>
                </div>

                <div class="item">
                  <div class="label">
                    Taxe ou frais
                  </div>
                  <div class="value">
                    ${echapperHtml(recu.taxeNom)}
                  </div>
                </div>

                <div class="item">
                  <div class="label">
                    Numéro de paiement
                  </div>
                  <div class="value">
                    ${echapperHtml(recu.numeroPaiement)}
                  </div>
                </div>

                ${
                  recu.activiteNom
                    ? `
                      <div class="item">
                        <div class="label">
                          Activité concernée
                        </div>
                        <div class="value">
                          ${echapperHtml(
                            recu.activiteNom,
                          )}
                        </div>
                      </div>
                    `
                    : ""
                }

                <div class="item">
                  <div class="label">
                    Mode de paiement
                  </div>
                  <div class="value">
                    ${echapperHtml(recu.modePaiement)}
                  </div>
                </div>

                <div class="item">
                  <div class="label">
                    Date du paiement
                  </div>
                  <div class="value">
                    ${echapperHtml(
                      formaterDate(recu.datePaiement),
                    )}
                  </div>
                </div>

                <div class="item">
                  <div class="label">
                    Période concernée
                  </div>
                  <div class="value">
                    ${echapperHtml(
                      recu.periodeConcernee ||
                        "Non renseignée",
                    )}
                  </div>
                </div>

                <div class="item">
                  <div class="label">
                    Montant dû
                  </div>
                  <div class="value">
                    ${echapperHtml(
                      formaterMontant(
                        recu.montantDu,
                        recu.devise,
                      ),
                    )}
                  </div>
                </div>

                <div class="item">
                  <div class="label">
                    Reste à payer
                  </div>
                  <div class="value">
                    ${echapperHtml(
                      formaterMontant(
                        recu.resteAPayer,
                        recu.devise,
                      ),
                    )}
                  </div>
                </div>

                <div class="item">
                  <div class="label">
                    Agent encaisseur
                  </div>
                  <div class="value">
                    ${echapperHtml(
                      recu.agentEncaisseur,
                    )}
                  </div>
                </div>

                <div class="item">
                  <div class="label">
                    Bureau d’encaissement
                  </div>
                  <div class="value">
                    ${echapperHtml(
                      recu.bureauEncaissement,
                    )}
                  </div>
                </div>
              </div>

              <div class="verification">
                <div>
                  <div class="label">
                    Code de vérification
                  </div>

                  <div class="verification-code">
                    ${echapperHtml(
                      recu.codeVerification,
                    )}
                  </div>

                  <div
                    style="
                      margin-top: 8px;
                      color: #666666;
                      font-size: ${
                        formatTicket ? "8px" : "11px"
                      };
                      line-height: 1.5;
                    "
                  >
                    Ce reçu sera vérifiable publiquement
                    grâce à son numéro et à son code.
                  </div>
                </div>

                <div class="qr">
                  QR
                </div>
              </div>
            </div>

            <footer class="footer">
              Reçu généré par Province Connect —
              Document administratif numérique.
              Toute modification non autorisée invalide ce reçu.
            </footer>
          </article>

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
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-xs font-black text-white"
            >
              PC
            </Link>

            <div className="min-w-0">
              <p className="truncate font-black text-black">
                Province Connect
              </p>

              <p className="truncate text-xs font-semibold text-black/65">
                Reçus numériques
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin/paiements"
              className="hidden rounded-xl border border-black/15 bg-white/30 px-4 py-2.5 text-sm font-extrabold text-black transition hover:bg-white/50 sm:inline-flex"
            >
              Paiements
            </Link>

            <Link
              href="/admin/taxes"
              className="hidden rounded-xl border border-black/15 bg-white/30 px-4 py-2.5 text-sm font-extrabold text-black transition hover:bg-white/50 md:inline-flex"
            >
              Taxes
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
              Reçus numériques
            </h1>

            <p className="mt-3 max-w-3xl leading-7 text-neutral-600">
              Consultez et imprimez les reçus générés
              automatiquement à partir des paiements
              provinciaux.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/paiements"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-black/15 bg-white px-5 text-sm font-extrabold text-black transition hover:bg-neutral-50"
            >
              + Nouveau paiement
            </Link>

            <button
              type="button"
              onClick={actualiserRecus}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-6 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
            >
              Actualiser les reçus
            </button>
          </div>
        </section>

        {paiements.length === 0 && (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-extrabold text-orange-900">
                Aucun paiement disponible
              </p>

              <p className="mt-1 text-sm leading-6 text-orange-800">
                Enregistrez d’abord un paiement pour générer
                automatiquement son reçu numérique.
              </p>
            </div>

            <Link
              href="/admin/paiements"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-extrabold text-white"
            >
              Enregistrer un paiement
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
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <CarteStatistique
            titre="Total des reçus"
            valeur={String(statistiques.total)}
            couleur="text-black"
          />

          <CarteStatistique
            titre="Reçus valides"
            valeur={String(statistiques.valides)}
            couleur="text-green-700"
          />

          <CarteStatistique
            titre="Paiements partiels"
            valeur={String(statistiques.partiels)}
            couleur="text-orange-600"
          />

          <CarteStatistique
            titre="Montant encaissé CDF"
            valeur={formaterMontant(
              statistiques.totalCDF,
              "CDF",
            )}
            couleur="text-green-700"
          />

          <CarteStatistique
            titre="Montant encaissé USD"
            valeur={formaterMontant(
              statistiques.totalUSD,
              "USD",
            )}
            couleur="text-blue-700"
          />
        </section>

        {/* Recherche et filtres */}
        <section className="mt-7 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1fr_210px_190px_220px]">
            <input
              type="search"
              value={recherche}
              onChange={(event) =>
                setRecherche(event.target.value)
              }
              placeholder="Rechercher par reçu, paiement, payeur, taxe, activité ou code..."
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />

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

              <option value="Valide">
                Valides
              </option>

              <option value="Paiement partiel">
                Paiements partiels
              </option>

              <option value="Annulé">
                Annulés
              </option>

              <option value="Remboursé">
                Remboursés
              </option>
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
              value={filtreMode}
              onChange={(event) =>
                setFiltreMode(event.target.value)
              }
              className="min-h-12 rounded-xl border border-black/15 bg-neutral-50 px-4 font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="Tous">
                Tous les modes
              </option>

              {modesPaiementDisponibles.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Liste */}
        <section className="mt-7">
          {recusFiltres.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/15 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 font-black text-neutral-500">
                REC
              </div>

              <h2 className="mt-5 text-xl font-black text-black">
                Aucun reçu numérique
              </h2>

              <p className="mx-auto mt-3 max-w-lg leading-7 text-neutral-500">
                Les reçus apparaîtront automatiquement après
                l’enregistrement des paiements provinciaux.
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
                        Numéro du reçu
                      </th>

                      <th className="px-5 py-4 font-black">
                        Taxe
                      </th>

                      <th className="px-5 py-4 font-black">
                        Montant
                      </th>

                      <th className="px-5 py-4 font-black">
                        Date
                      </th>

                      <th className="px-5 py-4 font-black">
                        Mode
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
                    {recusFiltres.map((recu) => (
                      <tr
                        key={recu.id}
                        className="border-t border-black/5 transition hover:bg-orange-50/40"
                      >
                        <td className="px-5 py-4">
                          <p className="font-extrabold text-black">
                            {recu.payeurNom}
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            {recu.payeurNumero}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-black text-black">
                            {recu.numeroRecu}
                          </p>

                          <p className="mt-1 text-xs font-bold text-neutral-500">
                            {recu.codeVerification}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-neutral-700">
                            {recu.taxeNom}
                          </p>

                          {recu.activiteNom && (
                            <p className="mt-1 text-xs text-neutral-500">
                              {recu.activiteNom}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 font-black text-green-700">
                          {formaterMontant(
                            recu.montantPaye,
                            recu.devise,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600">
                          {formaterDate(recu.datePaiement)}
                        </td>

                        <td className="px-5 py-4 text-sm text-neutral-600">
                          {recu.modePaiement}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold ${obtenirStyleStatut(
                              recu.statut,
                            )}`}
                          >
                            {recu.statut}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setRecuConsulte(recu)
                              }
                              className="rounded-lg bg-black px-3 py-2 text-xs font-extrabold text-white transition hover:bg-green-800"
                            >
                              Consulter
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                imprimerRecu(recu, "A4")
                              }
                              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-700 transition hover:bg-orange-100"
                            >
                              Imprimer A4
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                imprimerRecu(recu, "80mm")
                              }
                              className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-extrabold text-green-700 transition hover:bg-green-100"
                            >
                              Ticket 80 mm
                            </button>
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
      {recuConsulte && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="my-8 w-full max-w-5xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-5 bg-black px-6 py-5 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                  Reçu numérique provincial
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {recuConsulte.numeroRecu}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setRecuConsulte(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl transition hover:bg-white/20"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-green-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-green-700">
                    Montant encaissé
                  </p>

                  <p className="mt-2 text-3xl font-black text-green-800">
                    {formaterMontant(
                      recuConsulte.montantPaye,
                      recuConsulte.devise,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-orange-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-orange-700">
                    Montant dû
                  </p>

                  <p className="mt-2 text-3xl font-black text-black">
                    {formaterMontant(
                      recuConsulte.montantDu,
                      recuConsulte.devise,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-100 p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-neutral-500">
                    Reste à payer
                  </p>

                  <p className="mt-2 text-3xl font-black text-black">
                    {formaterMontant(
                      recuConsulte.resteAPayer,
                      recuConsulte.devise,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Information
                  label="Numéro du reçu"
                  valeur={recuConsulte.numeroRecu}
                />

                <Information
                  label="Code de vérification"
                  valeur={recuConsulte.codeVerification}
                />

                <Information
                  label="Statut"
                  valeur={recuConsulte.statut}
                />

                <Information
                  label="Payeur"
                  valeur={recuConsulte.payeurNom}
                />

                <Information
                  label="Numéro du payeur"
                  valeur={recuConsulte.payeurNumero}
                />

                <Information
                  label="Numéro de paiement"
                  valeur={recuConsulte.numeroPaiement}
                />

                <Information
                  label="Taxe ou frais"
                  valeur={recuConsulte.taxeNom}
                />

                <Information
                  label="Numéro de la taxe"
                  valeur={recuConsulte.taxeNumero}
                />

                <Information
                  label="Activité"
                  valeur={
                    recuConsulte.activiteNom ||
                    "Aucune activité liée"
                  }
                />

                <Information
                  label="Date du paiement"
                  valeur={formaterDate(
                    recuConsulte.datePaiement,
                  )}
                />

                <Information
                  label="Période concernée"
                  valeur={
                    recuConsulte.periodeConcernee ||
                    "Non renseignée"
                  }
                />

                <Information
                  label="Mode de paiement"
                  valeur={recuConsulte.modePaiement}
                />

                <Information
                  label="Référence"
                  valeur={
                    recuConsulte.referenceTransaction ||
                    "Aucune référence"
                  }
                />

                <Information
                  label="Agent encaisseur"
                  valeur={recuConsulte.agentEncaisseur}
                />

                <Information
                  label="Bureau d’encaissement"
                  valeur={
                    recuConsulte.bureauEncaissement
                  }
                />
              </div>

              <div className="mt-7 rounded-2xl border border-black/10 bg-neutral-50 p-5">
                <p className="text-xs font-black uppercase tracking-wider text-neutral-400">
                  Observations
                </p>

                <p className="mt-3 leading-7 text-neutral-700">
                  {recuConsulte.observations ||
                    "Aucune observation ajoutée."}
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    imprimerRecu(recuConsulte, "A4")
                  }
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-orange-600"
                >
                  Imprimer en A4
                </button>

                <button
                  type="button"
                  onClick={() =>
                    imprimerRecu(
                      recuConsulte,
                      "80mm",
                    )
                  }
                  className="rounded-xl bg-black px-5 py-3 text-sm font-extrabold text-white transition hover:bg-green-800"
                >
                  Imprimer en 80 mm
                </button>

                <button
                  type="button"
                  onClick={() =>
                    copierTexte(
                      recuConsulte.numeroRecu,
                      "Le numéro du reçu a été copié.",
                    )
                  }
                  className="rounded-xl border border-black/15 bg-white px-5 py-3 text-sm font-extrabold text-black transition hover:bg-neutral-100"
                >
                  Copier le numéro
                </button>

                <button
                  type="button"
                  onClick={() =>
                    copierTexte(
                      recuConsulte.codeVerification,
                      "Le code de vérification a été copié.",
                    )
                  }
                  className="rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-extrabold text-green-700 transition hover:bg-green-100"
                >
                  Copier le code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
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

      <p className="mt-2 break-words font-extrabold leading-6 text-black">
        {valeur}
      </p>
    </div>
  );
}



