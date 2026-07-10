"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import BanniereConsentement from "@/components/BanniereConsentement";
import NotificationButton from "@/components/NotificationButton";

type StatutCommunique = "Brouillon" | "Publié";

type CommuniqueAdmin = {
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

type CommuniquePublic = {
  id: string;
  categorie: string;
  titre: string;
  description: string;
  contenu: string;
  date: string;
  reference: string;
  image: string;
};

type TypeCarte = {
  code: string;
  nom: string;
  categorie: string;
  description: string;
};

// CLE_STOCKAGE supprimé — données désormais dans Supabase

const communiquesDemonstration: CommuniquePublic[] = [
  {
    id: "demo-1",
    categorie: "Communiqué officiel",
    titre: "Campagne provinciale d’enregistrement 2026",
    description:
      "Les commerçants, artistes, transporteurs et responsables d’activités sont invités à procéder à leur enregistrement officiel.",
    contenu:
      "Ce communiqué présente la campagne provinciale d’enregistrement des citoyens, professionnels et activités.",
    date: "10 juillet 2026",
    reference: "PC-COM-2026-001",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=85",
  },
  {
    id: "demo-2",
    categorie: "Avis public",
    titre: "Vérification numérique des documents provinciaux",
    description:
      "Les cartes, permis, autorisations et reçus provinciaux peuvent être vérifiés grâce à leur numéro unique.",
    contenu:
      "Le service public de vérification permet de contrôler rapidement l’authenticité d’un document provincial.",
    date: "8 juillet 2026",
    reference: "PC-AVIS-2026-014",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&q=85",
  },
  {
    id: "demo-3",
    categorie: "Information importante",
    titre: "Protégeons la province contre les faux documents",
    description:
      "Avant d’accepter un document présenté comme officiel, vérifiez son numéro ou son QR code sécurisé.",
    contenu:
      "Province Connect contribue à réduire la circulation des faux documents grâce à un système de vérification numérique.",
    date: "5 juillet 2026",
    reference: "PC-INFO-2026-021",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85",
  },
];

const typesCartes: TypeCarte[] = [
  {
    code: "PER",
    nom: "Permis provincial",
    categorie: "Permis et autorisations",
    description:
      "Permis officiel ou autorisation délivrée par l’administration provinciale.",
  },
  {
    code: "COM",
    nom: "Carte commerçant",
    categorie: "Commerce",
    description:
      "Carte professionnelle destinée aux commerçants officiellement enregistrés.",
  },
  {
    code: "ART",
    nom: "Carte artiste",
    categorie: "Culture et arts",
    description:
      "Carte d’identification provinciale destinée aux artistes et créateurs.",
  },
  {
    code: "ENS",
    nom: "Carte enseignant",
    categorie: "Éducation",
    description:
      "Carte professionnelle destinée aux enseignants enregistrés.",
  },
  {
    code: "TRP",
    nom: "Carte transporteur",
    categorie: "Transport",
    description:
      "Carte professionnelle pour les transporteurs et conducteurs enregistrés.",
  },
  {
    code: "ADM",
    nom: "Carte agent administratif",
    categorie: "Administration",
    description:
      "Badge professionnel destiné aux agents administratifs autorisés.",
  },
  {
    code: "ACT",
    nom: "Carte d’activité",
    categorie: "Activités professionnelles",
    description:
      "Identification officielle d’une boutique, entreprise ou structure.",
  },
  {
    code: "SOC",
    nom: "Carte structure sociale",
    categorie: "Secteur social",
    description:
      "Carte destinée aux associations et structures sociales enregistrées.",
  },
];

const services = [
  {
    numero: "01",
    titre: "Cartes provinciales",
    description:
      "Création et gestion des cartes pour commerçants, artistes, enseignants, transporteurs et autres professionnels.",
    couleur: "bg-orange-500",
    lien: "/verification",
    action: "Vérifier une carte",
  },
  {
    numero: "02",
    titre: "Permis et autorisations",
    description:
      "Délivrance, renouvellement et vérification des permis et autorisations provinciales.",
    couleur: "bg-green-700",
    lien: "/verification",
    action: "Vérifier un permis",
  },
  {
    numero: "03",
    titre: "Paiements et reçus",
    description:
      "Enregistrement sécurisé des taxes, paiements et reçus numériques vérifiables.",
    couleur: "bg-black",
    lien: "/verification-recu",
    action: "Vérifier un reçu",
  },
];

function formaterDatePublique(date: string) {
  if (!date) {
    return "Date non définie";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default function Home() {
  const [verificationVisible, setVerificationVisible] = useState(false);
  const [cartesVisibles, setCartesVisibles] = useState(false);
  const [carteSelectionnee, setCarteSelectionnee] =
    useState<TypeCarte | null>(null);

  const [communiques, setCommuniques] = useState<CommuniquePublic[]>(
    communiquesDemonstration,
  );

  const [communiqueActif, setCommuniqueActif] = useState(0);
  const [carouselEnPause, setCarouselEnPause] = useState(false);
  const [communiqueConsulte, setCommuniqueConsulte] =
    useState<CommuniquePublic | null>(null);

  const [numeroDocument, setNumeroDocument] = useState("");
  const [messageVerification, setMessageVerification] = useState("");

  /*
   * Récupération en temps réel des communiqués publiés depuis Supabase.
   */
  useEffect(() => {
    const supabase = createClient();

    async function chargerCommuniques() {
      const { data } = await supabase
        .from("communiques")
        .select("*")
        .eq("statut", "Publié")
        .order("date_publication", { ascending: false });

      if (data && data.length > 0) {
        const communiquesFormates = data.map<CommuniquePublic>((c) => ({
          id: c.id as string,
          categorie: c.categorie as string,
          titre: c.titre as string,
          description: c.resume as string,
          contenu: c.contenu as string,
          date: formaterDatePublique(c.date_publication as string),
          reference: c.reference as string,
          image: c.image as string,
        }));
        setCommuniques(communiquesFormates);
        setCommuniqueActif(0);
      } else {
        setCommuniques(communiquesDemonstration);
      }
    }

    void chargerCommuniques();

    // Abonnement temps réel — actualise dès qu'un communiqué change
    const canal = supabase
      .channel("communiques-publiques")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "communiques" },
        () => {
          void chargerCommuniques();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, []);

  /*
   * Défilement automatique des affiches.
   */
  useEffect(() => {
    if (carouselEnPause || communiques.length <= 1) {
      return;
    }

    const intervalle = window.setInterval(() => {
      setCommuniqueActif((indexActuel) =>
        indexActuel === communiques.length - 1
          ? 0
          : indexActuel + 1,
      );
    }, 6000);

    return () => window.clearInterval(intervalle);
  }, [carouselEnPause, communiques.length]);

  function communiquePrecedent() {
    setCommuniqueActif((indexActuel) =>
      indexActuel === 0
        ? communiques.length - 1
        : indexActuel - 1,
    );
  }

  function communiqueSuivant() {
    setCommuniqueActif((indexActuel) =>
      indexActuel === communiques.length - 1
        ? 0
        : indexActuel + 1,
    );
  }

  function fermerCartes() {
    setCartesVisibles(false);
    setCarteSelectionnee(null);
  }

  function fermerVerification() {
    setVerificationVisible(false);
    setNumeroDocument("");
    setMessageVerification("");
  }

  function verifierDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numeroNettoye = numeroDocument
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    if (!numeroNettoye) {
      setMessageVerification(
        "Veuillez saisir le numéro inscrit sur le document.",
      );
      return;
    }

    setMessageVerification("");

    const estUnRecu = numeroNettoye.startsWith("PC-REC-");

    const destination = estUnRecu
      ? `/verification-recu?numero=${encodeURIComponent(numeroNettoye)}`
      : `/verification?numero=${encodeURIComponent(numeroNettoye)}`;

    window.location.href = destination;
  }

  return (
    <main className="min-h-screen bg-white font-sans text-neutral-950 antialiased">
      {/* Barre de navigation */}
      <header className="sticky top-0 z-40 border-b border-orange-600 bg-orange-500 shadow-md">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="#accueil" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-sm font-black text-white shadow-lg">
              PC
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-black tracking-tight text-black sm:text-lg">
                Province Connect
              </h1>

              <p className="truncate text-[11px] font-semibold text-black/70 sm:text-xs">
                Registre Provincial Numérique
              </p>
            </div>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-extrabold lg:flex">
            <a
              href="#accueil"
              className="text-black transition hover:text-white"
            >
              Accueil
            </a>

            <a
              href="#communiques"
              className="text-black/75 transition hover:text-white"
            >
              Communiqués
            </a>

            <a
              href="#services"
              className="text-black/75 transition hover:text-white"
            >
              Services
            </a>

            <a
              href="#contact"
              className="text-black/75 transition hover:text-white"
            >
              Contact
            </a>
          </nav>

          {/* Cloche de notifications */}
          <NotificationButton />

        </div>
      </header>

      {/* Accueil */}
      <section
        id="accueil"
        className="relative overflow-hidden bg-gradient-to-br from-black via-neutral-950 to-green-950"
      >
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="absolute -right-40 top-0 h-[520px] w-[520px] rounded-full bg-green-600/20 blur-3xl" />

        <div className="relative mx-auto w-full max-w-[1600px] px-4 pb-16 pt-14 sm:px-6 md:pt-16 lg:px-8 lg:pb-20">
          <div className="mx-auto w-full text-center">
            <h2 className="mx-auto text-[clamp(2rem,3.7vw,3.35rem)] font-black leading-[1.08] tracking-[-0.045em] text-white xl:whitespace-nowrap">
              Une province mieux organisée, plus transparente et connectée
            </h2>

            <p className="mx-auto mt-6 max-w-4xl text-base leading-8 text-neutral-300 md:text-lg">
              Province Connect centralise l’enregistrement, la délivrance
              et la vérification des cartes, permis, autorisations,
              reçus et informations officielles de la province.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setVerificationVisible(true)}
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-orange-500 px-8 text-sm font-extrabold text-white shadow-xl shadow-orange-950/30 transition duration-300 hover:-translate-y-1 hover:bg-orange-400"
              >
                Vérifier un document

                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>

              <a
                href="/verification-recu"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/20 bg-white/10 px-8 text-sm font-extrabold text-white backdrop-blur transition hover:-translate-y-1 hover:border-green-400 hover:bg-green-700"
              >
                Vérifier un reçu
              </a>
            </div>
          </div>

          {/* Carrousel des communiqués */}
          <div
            id="communiques"
            className="mt-14 scroll-mt-24"
            onMouseEnter={() => setCarouselEnPause(true)}
            onMouseLeave={() => setCarouselEnPause(false)}
          >
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">
                  Actualités de la province
                </p>

                <h3 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
                  Communiqués et annonces officielles
                </h3>
              </div>

              {communiques.length > 1 && (
                <div className="hidden items-center gap-3 sm:flex">
                  <button
                    type="button"
                    onClick={communiquePrecedent}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl text-white backdrop-blur transition hover:border-orange-500 hover:bg-orange-500"
                    aria-label="Afficher l’affiche précédente"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={communiqueSuivant}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl text-white backdrop-blur transition hover:border-orange-500 hover:bg-orange-500"
                    aria-label="Afficher l’affiche suivante"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black shadow-2xl shadow-black/40">
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{
                  transform: `translateX(-${communiqueActif * 100}%)`,
                }}
              >
                {communiques.map((communique) => (
                  <article
                    key={communique.id}
                    className="relative min-h-[430px] min-w-full overflow-hidden"
                  >
                    <img
                      src={communique.image}
                      alt={communique.titre}
                      className="absolute inset-0 h-full w-full object-cover"
                    />

                    <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/20" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    <div className="relative flex min-h-[430px] items-end p-6 sm:p-9 md:p-12 lg:items-center">
                      <div className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-orange-500 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">
                            {communique.categorie}
                          </span>

                          <span className="text-sm font-semibold text-white/80">
                            {communique.date}
                          </span>
                        </div>

                        <h4 className="mt-6 text-3xl font-black leading-tight tracking-[-0.035em] text-white md:text-5xl">
                          {communique.titre}
                        </h4>

                        <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 md:text-lg">
                          {communique.description}
                        </p>

                        <div className="mt-7 flex flex-wrap items-center gap-4">
                          <button
                            type="button"
                            onClick={() =>
                              setCommuniqueConsulte(communique)
                            }
                            className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 text-sm font-extrabold text-black transition hover:bg-orange-500 hover:text-white"
                          >
                            Lire le communiqué

                            <span className="transition-transform group-hover:translate-x-1">
                              →
                            </span>
                          </button>

                          <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                            Réf. {communique.reference}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {communiques.length > 1 && (
              <div className="mt-5 flex items-center justify-between sm:justify-center">
                <div className="flex items-center gap-2">
                  {communiques.map((communique, index) => (
                    <button
                      key={communique.id}
                      type="button"
                      onClick={() => setCommuniqueActif(index)}
                      aria-label={`Afficher l’affiche ${index + 1}`}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        index === communiqueActif
                          ? "w-10 bg-orange-500"
                          : "w-2.5 bg-white/30 hover:bg-white/60"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 sm:hidden">
                  <button
                    type="button"
                    onClick={communiquePrecedent}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl text-white"
                    aria-label="Affiche précédente"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={communiqueSuivant}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl text-white"
                    aria-label="Affiche suivante"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Services */}
      <section
        id="services"
        className="scroll-mt-24 bg-white py-20"
      >
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-green-700">
              Services provinciaux
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight text-black md:text-5xl">
              Les services essentiels sur une seule plateforme
            </h2>

            <p className="mt-5 text-base leading-8 text-neutral-600">
              Une solution moderne pour enregistrer, délivrer, gérer et
              vérifier les documents provinciaux.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {services.map((service) => (
              <a
                key={service.numero}
                href={service.lien}
                className="group rounded-[28px] border border-black/10 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-2 hover:border-orange-300 hover:shadow-2xl"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${service.couleur} font-black text-white shadow-lg`}
                >
                  {service.numero}
                </div>

                <h3 className="mt-7 text-xl font-black tracking-tight text-black">
                  {service.titre}
                </h3>

                <p className="mt-4 text-sm leading-7 text-neutral-600">
                  {service.description}
                </p>

                <p className="mt-6 font-extrabold text-orange-600 transition group-hover:translate-x-1">
                  {service.action} →
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Pied de page */}
      <footer id="contact" className="bg-black text-white">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-sm font-black text-white">
              PC
            </div>

            <div>
              <p className="text-lg font-black">Province Connect</p>

              <p className="mt-1 text-sm text-neutral-400">
                Registre Provincial Numérique
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex flex-wrap gap-3">
              <a
                href="/verification"
                className="text-sm font-bold text-neutral-300 transition hover:text-orange-400"
              >
                Vérifier un document
              </a>

              <a
                href="/verification-recu"
                className="text-sm font-bold text-neutral-300 transition hover:text-green-400"
              >
                Vérifier un reçu
              </a>

              <a
                href="/admin/login"
                className="text-sm font-bold text-neutral-300 transition hover:text-white"
              >
                Administration
              </a>
            </div>

            <p className="text-sm text-neutral-400">
              © 2026 Province Connect. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>

      {/* Lecture d’un communiqué */}
      {communiqueConsulte && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <article className="my-8 w-full max-w-4xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="relative min-h-64 overflow-hidden">
              <img
                src={communiqueConsulte.image}
                alt={communiqueConsulte.titre}
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />

              <button
                type="button"
                onClick={() => setCommuniqueConsulte(null)}
                className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl font-black text-white backdrop-blur transition hover:bg-white/30"
                aria-label="Fermer le communiqué"
              >
                ×
              </button>

              <div className="relative flex min-h-64 items-end p-6 md:p-8">
                <div>
                  <span className="inline-flex rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white">
                    {communiqueConsulte.categorie}
                  </span>

                  <h3 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-white md:text-4xl">
                    {communiqueConsulte.titre}
                  </h3>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-neutral-500">
                <span>{communiqueConsulte.date}</span>
                <span>•</span>
                <span>Réf. {communiqueConsulte.reference}</span>
              </div>

              <p className="mt-6 text-lg font-semibold leading-8 text-neutral-700">
                {communiqueConsulte.description}
              </p>

              <div className="mt-6 whitespace-pre-line leading-8 text-neutral-700">
                {communiqueConsulte.contenu}
              </div>

              <div className="mt-8 flex flex-wrap gap-3 border-t border-black/10 pt-6">
                <button
                  type="button"
                  onClick={() => setCommuniqueConsulte(null)}
                  className="rounded-xl bg-black px-5 py-3 text-sm font-extrabold text-white transition hover:bg-orange-500"
                >
                  Fermer
                </button>

                <a
                  href="/verification"
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-orange-600"
                >
                  Vérifier un document
                </a>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* Fenêtre de vérification */}
      {verificationVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="my-8 w-full max-w-xl rounded-[30px] bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-green-700">
                  Vérification publique
                </p>

                <h3 className="mt-3 text-3xl font-black tracking-tight text-black">
                  Vérifiez un document officiel
                </h3>
              </div>

              <button
                type="button"
                onClick={fermerVerification}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl font-bold text-neutral-700 transition hover:bg-neutral-200"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <p className="mt-5 leading-7 text-neutral-600">
              Entrez le numéro d’une carte, d’un permis, d’une
              autorisation ou d’un reçu provincial.
            </p>

            <form onSubmit={verifierDocument} className="mt-7">
              <label
                htmlFor="numero-document"
                className="mb-2 block text-sm font-extrabold text-black"
              >
                Numéro du document
              </label>

              <input
                id="numero-document"
                type="text"
                value={numeroDocument}
                onChange={(event) => {
                  setNumeroDocument(event.target.value);
                  setMessageVerification("");
                }}
                placeholder="Exemple : PC-COM-2026-000001"
                className="min-h-14 w-full rounded-2xl border border-black/15 bg-neutral-50 px-5 font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />

              <button
                type="submit"
                className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 font-extrabold text-white transition hover:bg-orange-600"
              >
                Vérifier le document
                <span>→</span>
              </button>
            </form>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                href="/verification"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-black/10 bg-neutral-100 px-4 text-sm font-extrabold text-black transition hover:bg-neutral-200"
              >
                Page des documents
              </a>

              <a
                href="/verification-recu"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-green-200 bg-green-50 px-4 text-sm font-extrabold text-green-700 transition hover:bg-green-100"
              >
                Page des reçus
              </a>
            </div>

            {messageVerification && (
              <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-medium leading-6 text-orange-900">
                {messageVerification}
              </div>
            )}

            <p className="mt-5 text-sm leading-6 text-neutral-500">
              Les informations privées du titulaire ne sont jamais
              affichées publiquement.
            </p>
          </div>
        </div>
      )}

      {/* Choix des cartes */}
      {cartesVisibles && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="my-8 w-full max-w-5xl rounded-[32px] bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
                  Documents provinciaux
                </p>

                <h3 className="mt-3 text-3xl font-black tracking-tight text-black md:text-4xl">
                  {carteSelectionnee
                    ? carteSelectionnee.nom
                    : "Choisissez le type de carte"}
                </h3>

                {!carteSelectionnee && (
                  <p className="mt-4 max-w-2xl leading-7 text-neutral-600">
                    Sélectionnez le domaine de la carte ou du permis
                    que vous souhaitez consulter.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={fermerCartes}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl font-bold text-neutral-700 transition hover:bg-neutral-200"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            {!carteSelectionnee ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {typesCartes.map((typeCarte) => (
                  <button
                    key={typeCarte.code}
                    type="button"
                    onClick={() => setCarteSelectionnee(typeCarte)}
                    className="group rounded-[24px] border border-black/10 bg-neutral-50 p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-orange-400 hover:bg-white hover:shadow-xl"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-xs font-black text-white transition group-hover:bg-orange-500">
                      {typeCarte.code}
                    </div>

                    <p className="mt-5 text-xs font-black uppercase tracking-wider text-green-700">
                      {typeCarte.categorie}
                    </p>

                    <h4 className="mt-2 text-lg font-black text-black">
                      {typeCarte.nom}
                    </h4>

                    <p className="mt-3 text-sm leading-6 text-neutral-600">
                      {typeCarte.description}
                    </p>

                    <p className="mt-5 font-extrabold text-orange-600">
                      Voir le modèle →
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => setCarteSelectionnee(null)}
                  className="mb-6 font-extrabold text-orange-600"
                >
                  ← Retour aux types de cartes
                </button>

                <div className="overflow-hidden rounded-[30px] bg-gradient-to-br from-black via-neutral-900 to-green-800 p-1 shadow-2xl">
                  <div className="rounded-[27px] bg-white p-6 md:p-9">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-green-700">
                          Province Connect
                        </p>

                        <h4 className="mt-3 text-2xl font-black text-black md:text-3xl">
                          {carteSelectionnee.nom}
                        </h4>
                      </div>

                      <a
                        href={`/verification?numero=${encodeURIComponent(
                          `PC-${carteSelectionnee.code}-2026-000001`,
                        )}`}
                        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 font-black text-white transition hover:bg-green-700"
                        aria-label="Tester la vérification du modèle"
                      >
                        QR
                      </a>
                    </div>

                    <div className="mt-8 grid gap-7 sm:grid-cols-[140px_1fr]">
                      <div className="flex h-44 items-center justify-center rounded-2xl bg-neutral-200 text-sm font-semibold text-neutral-500">
                        Photo
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold uppercase text-neutral-400">
                            Titulaire
                          </p>

                          <p className="mt-2 font-extrabold text-black">
                            Exemple de titulaire
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase text-neutral-400">
                            Catégorie
                          </p>

                          <p className="mt-2 font-extrabold text-black">
                            {carteSelectionnee.categorie}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase text-neutral-400">
                            Numéro
                          </p>

                          <p className="mt-2 font-extrabold text-black">
                            PC-{carteSelectionnee.code}-2026-000001
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase text-neutral-400">
                            Statut
                          </p>

                          <span className="mt-2 inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-extrabold text-green-800">
                            Document valide
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-4 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm text-neutral-500">
                        Service fiable. Province connectée.
                      </span>

                      <a
                        href={`/verification?numero=${encodeURIComponent(
                          `PC-${carteSelectionnee.code}-2026-000001`,
                        )}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-extrabold text-white transition hover:bg-orange-500"
                      >
                        Tester la vérification
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Bannière de consentement cookies + notifications */}
      <BanniereConsentement />
    </main>
  );
}