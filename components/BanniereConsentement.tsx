"use client";

import { useEffect, useState } from "react";

const CLE_CONSENTEMENT = "pc-consentement-accepte";
const CLE_NOTIFICATIONS = "pc-notifications-acceptees";

function convertirCleVapid(clePublique: string) {
  const remplissage = "=".repeat((4 - (clePublique.length % 4)) % 4);
  const base64 = (clePublique + remplissage)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const donneesBrutes = window.atob(base64);
  return Uint8Array.from([...donneesBrutes].map((c) => c.charCodeAt(0)));
}

async function souscrireAuxNotifications(): Promise<boolean> {
  try {
    const clePublique = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (
      !clePublique ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return false;
    }

    const autorisation = await Notification.requestPermission();

    if (autorisation !== "granted") {
      return false;
    }

    const inscription = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    await navigator.serviceWorker.ready;

    const abonnementExistant =
      await inscription.pushManager.getSubscription();

    if (abonnementExistant) {
      await abonnementExistant.unsubscribe();
    }

    const abonnement = await inscription.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertirCleVapid(clePublique),
    });

    const cleJson = abonnement.toJSON();

    await fetch("/api/notifications/subscribe-public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: abonnement.endpoint,
        p256dh: cleJson.keys?.p256dh,
        auth: cleJson.keys?.auth,
      }),
    });

    return true;
  } catch {
    return false;
  }
}

export default function BanniereConsentement() {
  const [visible, setVisible] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    const dejaAccepte = localStorage.getItem(CLE_CONSENTEMENT);

    if (!dejaAccepte) {
      // Petit délai pour ne pas afficher immédiatement au chargement
      const minuterie = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(minuterie);
    }
  }, []);

  async function toutAccepter() {
    setEnCours(true);
    localStorage.setItem(CLE_CONSENTEMENT, "oui");

    const succes = await souscrireAuxNotifications();

    if (succes) {
      localStorage.setItem(CLE_NOTIFICATIONS, "oui");
    }

    setEnCours(false);
    setVisible(false);
  }

  function continuerSansNotifications() {
    localStorage.setItem(CLE_CONSENTEMENT, "oui");
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Consentement aux cookies et notifications"
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl"
    >
      <div className="p-5 sm:p-6">
        {/* En-tête */}
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-lg font-black text-white">
            PC
          </div>

          <div className="min-w-0">
            <p className="font-black text-white">Province Connect</p>
            <p className="mt-0.5 text-xs font-semibold text-neutral-400">
              Cookies et notifications
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="mt-4 text-sm leading-6 text-neutral-300">
          Ce site utilise des cookies essentiels à son fonctionnement. Vous
          pouvez également activer les{" "}
          <strong className="text-white">notifications push</strong> pour
          recevoir automatiquement les communiqués et annonces officielles de
          la province.
        </p>

        {/* Détails */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
            <p className="text-xs font-semibold text-neutral-300">
              <span className="text-white">Cookies essentiels</span> —
              nécessaires au bon fonctionnement du site
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
            <p className="text-xs font-semibold text-neutral-300">
              <span className="text-white">Notifications push</span> —
              alertes officielles de l&apos;administration provinciale
            </p>
          </div>
        </div>

        {/* Boutons */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={toutAccepter}
            disabled={enCours}
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-extrabold text-white transition hover:bg-orange-400 disabled:opacity-60"
          >
            {enCours ? "Activation…" : "Tout accepter et s'abonner"}
          </button>

          <button
            type="button"
            onClick={continuerSansNotifications}
            disabled={enCours}
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-neutral-300 transition hover:border-white/20 hover:text-white"
          >
            Continuer sans notifications
          </button>
        </div>
      </div>
    </div>
  );
}
