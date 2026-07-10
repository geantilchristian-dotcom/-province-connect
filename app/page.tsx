"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSupabaseCollection } from "../lib/data/useSupabaseCollection";

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

type Service = {
  numero: string;
  icone: string;
  titre: string;
  description: string;
  lien: string;
  action: string;
};

const communiquesDemonstration: CommuniquePublic[] = [
  {
    id: "demo-1",
    categorie: "Information importante",
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
    categorie: "Travaux publics",
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
    categorie: "Économie",
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

const services: Service[] = [
  {
    numero: "01",
    icone: "▤",
    titre: "Vérifier un document",
    description:
      "Authentifiez une carte, un permis ou une autorisation provinciale.",
    lien: "/verification",
    action: "Ouvrir la vérification",
  },
  {
    numero: "02",
    icone: "✓",
    titre: "Vérifier un reçu",
    description:
      "Contrôlez rapidement la validité d’un reçu émis par la province.",
    lien: "/verification-recu",
    action: "Contrôler un reçu",
  },
  {
    numero: "03",
    icone: "ID",
    titre: "Services aux citoyens",
    description:
      "Accédez aux informations et démarches disponibles pour les citoyens.",
    lien: "#contact",
    action: "Voir les informations",
  },
  {
    numero: "04",
    icone: "↓",
    titre: "Formulaires et demandes",
    description:
      "Consultez les formulaires et les procédures administratives.",
    lien: "#contact",
    action: "Consulter les démarches",
  },
  {
    numero: "05",
    icone: "!",
    titre: "Annonces publiques",
    description:
      "Retrouvez les avis et communiqués officiels publiés par la province.",
    lien: "#communiques",
    action: "Voir les annonces",
  },
  {
    numero: "06",
    icone: "▥",
    titre: "Données et rapports",
    description:
      "Consultez les informations publiques et rapports provinciaux.",
    lien: "#contact",
    action: "Voir les rapports",
  },
];

function formaterDatePublique(date: string) {
  if (!date) return "Date non définie";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default function Home() {
  const [verificationVisible, setVerificationVisible] = useState(false);
  const [servicesVisibles, setServicesVisibles] = useState(false);
  const [menuMobileVisible, setMenuMobileVisible] = useState(false);

  const [communiquesAdmin, setCommuniquesAdmin] =
    useState<CommuniqueAdmin[]>([]);
  const [communiques, setCommuniques] = useState<CommuniquePublic[]>(
    communiquesDemonstration,
  );

  const [communiqueActif, setCommuniqueActif] = useState(0);
  const [carouselEnPause, setCarouselEnPause] = useState(false);
  const [communiqueConsulte, setCommuniqueConsulte] =
    useState<CommuniquePublic | null>(null);

  const [numeroDocument, setNumeroDocument] = useState("");
  const [messageVerification, setMessageVerification] = useState("");

  useSupabaseCollection({
    table: "communiques",
    items: communiquesAdmin,
    setItems: setCommuniquesAdmin,
    readOnly: true,
  });

  useEffect(() => {
    const communiquesPublies = communiquesAdmin
      .filter(
        (communique) =>
          communique.statut === "Publié" &&
          communique.titre &&
          communique.image,
      )
      .sort((premier, deuxieme) => {
        const datePremier = new Date(
          `${premier.datePublication}T00:00:00`,
        ).getTime();
        const dateDeuxieme = new Date(
          `${deuxieme.datePublication}T00:00:00`,
        ).getTime();

        return dateDeuxieme - datePremier;
      })
      .map<CommuniquePublic>((communique) => ({
        id: communique.id,
        categorie: communique.categorie,
        titre: communique.titre,
        description: communique.resume,
        contenu: communique.contenu,
        date: formaterDatePublique(communique.datePublication),
        reference: communique.reference,
        image: communique.image,
      }));

    setCommuniques(
      communiquesPublies.length > 0
        ? communiquesPublies
        : communiquesDemonstration,
    );
    setCommuniqueActif(0);
  }, [communiquesAdmin]);

  useEffect(() => {
    if (carouselEnPause || communiques.length <= 1) return;

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
      indexActuel === 0 ? communiques.length - 1 : indexActuel - 1,
    );
  }

  function communiqueSuivant() {
    setCommuniqueActif((indexActuel) =>
      indexActuel === communiques.length - 1 ? 0 : indexActuel + 1,
    );
  }

  function afficherServices() {
    setServicesVisibles((etatActuel) => !etatActuel);

    window.setTimeout(() => {
      document
        .getElementById("services")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
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

    const estUnRecu = numeroNettoye.startsWith("PC-REC-");
    const destination = estUnRecu
      ? `/verification-recu?numero=${encodeURIComponent(numeroNettoye)}`
      : `/verification?numero=${encodeURIComponent(numeroNettoye)}`;

    window.location.href = destination;
  }

  return (
    <main className="min-h-screen bg-white font-sans text-neutral-950 antialiased">
      <header className="sticky top-0 z-40 border-b border-orange-700 bg-[#f4510b] text-white shadow-sm">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a href="#accueil" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-[#f4510b] shadow-sm">
              PC
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-black tracking-tight sm:text-lg">
                Province Connect
              </p>
              <p className="truncate text-[10px] font-semibold text-white/80 sm:text-xs">
                Registre Provincial Numérique
              </p>
            </div>
          </a>

          <nav className="hidden items-center gap-6 text-[13px] font-bold xl:flex">
            <a
              href="#accueil"
              className="border-b-2 border-white pb-2 transition hover:text-white/75"
            >
              Accueil
            </a>
            <a href="#professionnels" className="transition hover:text-white/75">
              Professionnels
            </a>
            <a href="#communiques" className="transition hover:text-white/75">
              Communiqués
            </a>
            <button
              type="button"
              onClick={afficherServices}
              className="transition hover:text-white/75"
            >
              Services et démarches
            </button>
            <a href="#contact" className="transition hover:text-white/75">
              Contact
            </a>
            <a href="#confidentialite" className="transition hover:text-white/75">
              Règles et confidentialité
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVerificationVisible(true)}
              className="hidden min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[12px] font-black text-[#e74405] shadow-sm transition hover:-translate-y-0.5 sm:inline-flex"
            >
              <span aria-hidden="true">✓</span>
              Vérifier un document
            </button>

            <button
              type="button"
              onClick={() => setMenuMobileVisible((etat) => !etat)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 text-xl xl:hidden"
              aria-label="Afficher le menu"
            >
              {menuMobileVisible ? "×" : "☰"}
            </button>
          </div>
        </div>

        {menuMobileVisible && (
          <nav className="border-t border-white/20 bg-[#e74405] px-4 py-4 xl:hidden">
            <div className="mx-auto grid max-w-[1500px] gap-2 text-sm font-bold">
              <a href="#accueil" onClick={() => setMenuMobileVisible(false)} className="rounded-lg px-3 py-2 hover:bg-white/10">
                Accueil
              </a>
              <a href="#professionnels" onClick={() => setMenuMobileVisible(false)} className="rounded-lg px-3 py-2 hover:bg-white/10">
                Professionnels
              </a>
              <a href="#communiques" onClick={() => setMenuMobileVisible(false)} className="rounded-lg px-3 py-2 hover:bg-white/10">
                Communiqués
              </a>
              <button
                type="button"
                onClick={() => {
                  setMenuMobileVisible(false);
                  afficherServices();
                }}
                className="rounded-lg px-3 py-2 text-left hover:bg-white/10"
              >
                Services et démarches
              </button>
              <a href="#contact" onClick={() => setMenuMobileVisible(false)} className="rounded-lg px-3 py-2 hover:bg-white/10">
                Contact
              </a>
              <a href="#confidentialite" onClick={() => setMenuMobileVisible(false)} className="rounded-lg px-3 py-2 hover:bg-white/10">
                Règles et confidentialité
              </a>
              <button
                type="button"
                onClick={() => {
                  setMenuMobileVisible(false);
                  setVerificationVisible(true);
                }}
                className="mt-2 rounded-xl bg-white px-4 py-3 text-left font-black text-[#e74405]"
              >
                Vérifier un document
              </button>
            </div>
          </nav>
        )}
      </header>

      <section id="accueil" className="relative overflow-hidden border-b border-neutral-200 bg-white">
        <div className="mx-auto grid w-full max-w-[1500px] items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-20">
          <div>
            <h1 className="max-w-4xl text-[clamp(2rem,5vw,4rem)] font-black leading-[1.04] tracking-[-0.05em] text-neutral-950">
              Une province mieux organisée, plus transparente et connectée.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-600 sm:text-base">
              Province Connect simplifie vos démarches, renforce la transparence
              et vous rapproche des services publics.
            </p>

            <div className="mt-7 grid max-w-2xl gap-4 sm:grid-cols-3">
              {[
                ["◉", "Services accessibles", "24 h/24 et 7 j/7"],
                ["✓", "Données sécurisées", "et confidentielles"],
                ["✓", "Informations officielles", "et à jour"],
              ].map(([icone, titre, detail]) => (
                <div key={titre} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-sm font-black text-[#f4510b]">
                    {icone}
                  </span>
                  <div>
                    <p className="text-xs font-black text-neutral-900 sm:text-sm">
                      {titre}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-500 sm:text-xs">
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute bottom-5 left-0 hidden w-44 space-y-2 lg:block">
              <div className="h-1.5 rounded-r-full bg-[#f4510b]" />
              <div className="h-1.5 w-[88%] rounded-r-full bg-[#087b39]" />
              <div className="h-1.5 w-[76%] rounded-r-full bg-[#e30613]" />
            </div>
          </div>

          <div className="relative mx-auto flex min-h-[250px] w-full max-w-xl items-center justify-center rounded-[32px] border border-orange-100 bg-orange-50/40 p-7">
            <div className="absolute inset-5 rounded-[28px] border border-dashed border-orange-200" />

            <div className="relative h-52 w-full">
              {[
                ["15%", "62%"],
                ["32%", "35%"],
                ["49%", "68%"],
                ["66%", "30%"],
                ["80%", "58%"],
              ].map(([left, top], index) => (
                <span
                  key={`${left}-${top}`}
                  className="absolute h-3 w-3 rounded-full bg-[#f4510b] shadow-[0_0_0_7px_rgba(244,81,11,0.10)]"
                  style={{ left, top }}
                  aria-hidden="true"
                >
                  {index === 0 ? "" : ""}
                </span>
              ))}

              <svg
                viewBox="0 0 600 260"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <path d="M90 165 Q190 35 295 180" fill="none" stroke="#f4510b" strokeWidth="2" opacity=".42" />
                <path d="M190 90 Q320 10 480 150" fill="none" stroke="#f4510b" strokeWidth="2" opacity=".42" />
                <path d="M295 180 Q380 55 480 150" fill="none" stroke="#f4510b" strokeWidth="2" opacity=".42" />
                <path d="M90 165 Q320 235 480 150" fill="none" stroke="#f4510b" strokeWidth="2" opacity=".28" />
              </svg>

              <div className="absolute inset-x-0 bottom-2 text-center">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f4510b]">
                  Réseau provincial numérique
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  Services, documents et informations connectés.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="professionnels"
        className="border-b border-neutral-200 bg-neutral-50 py-7"
      >
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-sm font-black text-neutral-950">
              Espace professionnels
            </p>
            <p className="mt-1 text-xs leading-5 text-neutral-500 sm:text-sm">
              Commerçants, artistes, enseignants, transporteurs et structures
              provinciales.
            </p>
          </div>

          <a
            href="/admin/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-orange-200 bg-white px-5 text-sm font-black text-[#e74405] shadow-sm transition hover:border-[#f4510b]"
          >
            Accéder à l’espace professionnel →
          </a>
        </div>
      </section>

      <section
        id="communiques"
        className="scroll-mt-24 border-b border-neutral-200 bg-white py-12 sm:py-16"
        onMouseEnter={() => setCarouselEnPause(true)}
        onMouseLeave={() => setCarouselEnPause(false)}
      >
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between gap-5">
            <h2 className="text-xl font-black tracking-tight text-neutral-950 sm:text-2xl">
              Communiqués récents
            </h2>

            {communiques.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={communiquePrecedent}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-lg shadow-sm transition hover:border-orange-300 hover:text-[#f4510b]"
                  aria-label="Communiqué précédent"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={communiqueSuivant}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-lg shadow-sm transition hover:border-orange-300 hover:text-[#f4510b]"
                  aria-label="Communiqué suivant"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${communiqueActif * 100}%)` }}
            >
              {communiques.map((communique) => (
                <article
                  key={communique.id}
                  className="relative h-[290px] min-w-full overflow-hidden rounded-[24px] bg-neutral-900 shadow-lg sm:h-[360px]"
                >
                  <img
                    src={communique.image}
                    alt={communique.titre}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/15" />

                  <div className="relative flex h-full max-w-3xl flex-col justify-end p-6 sm:p-9">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-[#f4510b] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white sm:text-[10px]">
                        {communique.categorie}
                      </span>
                      <span className="text-xs font-bold text-white/80">
                        {communique.date}
                      </span>
                    </div>

                    <h3 className="mt-4 line-clamp-2 text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                      {communique.titre}
                    </h3>

                    <p className="mt-3 hidden max-w-2xl text-sm leading-6 text-white/75 sm:block">
                      {communique.description}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setCommuniqueConsulte(communique)}
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-xs font-black text-neutral-950 transition hover:bg-[#f4510b] hover:text-white sm:text-sm"
                      >
                        Lire le communiqué →
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 sm:text-xs">
                        Réf. {communique.reference}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {communiques.length > 1 && (
            <div className="mt-5 flex justify-center gap-2">
              {communiques.map((communique, index) => (
                <button
                  key={communique.id}
                  type="button"
                  onClick={() => setCommuniqueActif(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === communiqueActif
                      ? "w-9 bg-[#f4510b]"
                      : "w-2.5 bg-neutral-300"
                  }`}
                  aria-label={`Afficher le communiqué ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="services" className="scroll-mt-24 bg-white py-10 sm:py-14">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 rounded-[24px] border border-orange-100 bg-orange-50/50 p-5 sm:flex-row sm:items-center sm:p-7">
            <div>
              <h2 className="text-xl font-black tracking-tight text-neutral-950 sm:text-2xl">
                Services et démarches
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                Les services restent masqués pour garder une page claire.
                Cliquez sur le bouton pour les afficher.
              </p>
            </div>

            <button
              type="button"
              onClick={afficherServices}
              aria-expanded={servicesVisibles}
              className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#f4510b] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#df4508] sm:w-auto"
            >
              {servicesVisibles
                ? "Masquer les services"
                : "Afficher les services et démarches"}
              <span
                className={`text-lg transition-transform ${
                  servicesVisibles ? "rotate-180" : ""
                }`}
              >
                ↓
              </span>
            </button>
          </div>

          {servicesVisibles && (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {services.map((service) => (
                <a
                  key={service.numero}
                  href={service.lien}
                  className="group rounded-[20px] border border-neutral-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-sm font-black text-[#f4510b]">
                    {service.icone}
                  </div>

                  <h3 className="mt-5 text-sm font-black text-neutral-950">
                    {service.titre}
                  </h3>
                  <p className="mt-3 text-xs leading-5 text-neutral-500">
                    {service.description}
                  </p>
                  <p className="mt-5 text-xs font-black text-[#e74405]">
                    {service.action} →
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer
        id="contact"
        className="relative border-t border-neutral-200 bg-white"
      >
        <div className="mx-auto grid w-full max-w-[1500px] gap-10 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4510b] text-xs font-black text-white">
                PC
              </div>
              <div>
                <p className="text-sm font-black">
                  Province <span className="text-[#f4510b]">Connect</span>
                </p>
                <p className="text-[10px] text-neutral-500">
                  Registre Provincial Numérique
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-xs leading-6 text-neutral-500">
              Plateforme provinciale de services transparents, sécurisés et
              accessibles.
            </p>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#f4510b]">
              Liens rapides
            </p>
            <div className="mt-4 grid gap-2 text-xs font-semibold text-neutral-600">
              <a href="#accueil">Accueil</a>
              <a href="#professionnels">Professionnels</a>
              <a href="#communiques">Communiqués</a>
              <button type="button" onClick={afficherServices} className="text-left">
                Services et démarches
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#f4510b]">
              Contact
            </p>
            <div className="mt-4 space-y-2 text-xs leading-5 text-neutral-600">
              <p>Province Connect</p>
              <p>Administration provinciale</p>
              <a href="/admin/login" className="font-black text-[#e74405]">
                Accès administration
              </a>
            </div>
          </div>

          <div id="confidentialite">
            <p className="text-xs font-black uppercase tracking-wider text-[#f4510b]">
              Règles et confidentialité
            </p>
            <p className="mt-4 text-xs leading-6 text-neutral-500">
              Les informations privées des titulaires ne sont jamais affichées
              publiquement. Seules les données nécessaires à la vérification
              sont communiquées.
            </p>
          </div>
        </div>

        <div className="h-2 bg-[#f4510b]" />
        <div className="absolute bottom-0 right-0 hidden w-52 translate-y-1 space-y-1.5 lg:block">
          <div className="h-1 rounded-l-full bg-[#f4510b]" />
          <div className="ml-auto h-1 w-[86%] rounded-l-full bg-[#087b39]" />
          <div className="ml-auto h-1 w-[72%] rounded-l-full bg-[#e30613]" />
        </div>
      </footer>

      {communiqueConsulte && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <article className="my-8 w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="relative min-h-56 overflow-hidden">
              <img
                src={communiqueConsulte.image}
                alt={communiqueConsulte.titre}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20" />

              <button
                type="button"
                onClick={() => setCommuniqueConsulte(null)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg font-black text-white backdrop-blur"
                aria-label="Fermer"
              >
                ×
              </button>

              <div className="relative flex min-h-56 items-end p-6">
                <div>
                  <span className="rounded-full bg-[#f4510b] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white">
                    {communiqueConsulte.categorie}
                  </span>
                  <h3 className="mt-4 text-2xl font-black leading-tight text-white sm:text-3xl">
                    {communiqueConsulte.titre}
                  </h3>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap gap-3 text-xs font-bold text-neutral-500">
                <span>{communiqueConsulte.date}</span>
                <span>•</span>
                <span>Réf. {communiqueConsulte.reference}</span>
              </div>
              <p className="mt-5 text-sm font-semibold leading-7 text-neutral-700">
                {communiqueConsulte.description}
              </p>
              <div className="mt-5 whitespace-pre-line text-sm leading-7 text-neutral-600">
                {communiqueConsulte.contenu}
              </div>

              <button
                type="button"
                onClick={() => setCommuniqueConsulte(null)}
                className="mt-7 rounded-xl bg-neutral-950 px-5 py-3 text-sm font-black text-white"
              >
                Fermer
              </button>
            </div>
          </article>
        </div>
      )}

      {verificationVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="my-6 w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="relative bg-[#f4510b] px-6 pb-8 pt-7 text-center text-white sm:px-8 sm:pb-10 sm:pt-9">
              <button
                type="button"
                onClick={fermerVerification}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-lg font-black"
                aria-label="Fermer"
              >
                ×
              </button>

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-2xl font-black">
                ✓
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-white/85 sm:text-xs">
                Vérification publique
              </p>
              <h3 className="mx-auto mt-3 max-w-md text-2xl font-black leading-tight sm:text-3xl">
                Vérifiez un document officiel
              </h3>
              <p className="mx-auto mt-3 max-w-md text-xs leading-6 text-white/85 sm:text-sm">
                Entrez le numéro d’une carte, d’un permis, d’une autorisation ou
                d’un reçu provincial.
              </p>
            </div>

            <div className="p-5 sm:p-8">
              <form onSubmit={verifierDocument}>
                <label
                  htmlFor="numero-document"
                  className="mb-2 block text-sm font-black text-neutral-900"
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
                  className="min-h-14 w-full rounded-2xl border border-neutral-300 bg-neutral-50 px-4 text-sm font-semibold outline-none transition focus:border-[#f4510b] focus:bg-white focus:ring-4 focus:ring-orange-100"
                />

                <button
                  type="submit"
                  className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#f4510b] px-5 text-sm font-black text-white transition hover:bg-[#df4508]"
                >
                  <span>✓</span>
                  Vérifier un document
                  <span>→</span>
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-200" />
                <span className="text-[10px] font-black uppercase text-neutral-400">
                  ou
                </span>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href="/verification"
                  className="inline-flex min-h-12 items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 text-xs font-black text-neutral-800 transition hover:border-orange-300"
                >
                  <span>▤ Page des documents</span>
                  <span>›</span>
                </a>
                <a
                  href="/verification-recu"
                  className="inline-flex min-h-12 items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 text-xs font-black text-neutral-800 transition hover:border-green-300"
                >
                  <span>▧ Page des reçus</span>
                  <span>›</span>
                </a>
              </div>

              {messageVerification && (
                <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs font-semibold leading-5 text-orange-900">
                  {messageVerification}
                </div>
              )}

              <p className="mt-5 text-center text-[11px] leading-5 text-neutral-500">
                🔒 Les informations privées du titulaire ne sont jamais
                affichées publiquement.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
