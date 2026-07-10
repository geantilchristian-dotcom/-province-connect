"use client";

import {
  useEffect,
  useState,
} from "react";

type EtatNotification =
  | "verification"
  | "non-supporte"
  | "inactive"
  | "activation"
  | "active"
  | "refusee"
  | "erreur";

type ReponseApi = {
  succes?: boolean;
  message?: string;
};

function convertirCleVapid(
  clePublique: string,
) {
  const remplissage = "=".repeat(
    (4 - (clePublique.length % 4)) % 4,
  );

  const base64 = (
    clePublique + remplissage
  )
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const donneesBrutes = window.atob(base64);

  return Uint8Array.from(
    [...donneesBrutes].map(
      (caractere) =>
        caractere.charCodeAt(0),
    ),
  );
}

function navigateurCompatible() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export default function NotificationButton() {
  const [etat, setEtat] =
    useState<EtatNotification>(
      "verification",
    );

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    let actif = true;

    async function verifierEtat() {
      if (!navigateurCompatible()) {
        if (actif) {
          setEtat("non-supporte");
        }

        return;
      }

      if (
        Notification.permission ===
        "denied"
      ) {
        if (actif) {
          setEtat("refusee");
        }

        return;
      }

      try {
        const inscription =
          await navigator.serviceWorker.register(
            "/sw.js",
            {
              scope: "/",
            },
          );

        const abonnement =
          await inscription.pushManager.getSubscription();

        if (!actif) {
          return;
        }

        setEtat(
          abonnement ? "active" : "inactive",
        );
      } catch {
        if (actif) {
          setEtat("erreur");
        }
      }
    }

    void verifierEtat();

    return () => {
      actif = false;
    };
  }, []);

  async function activerNotifications() {
    setMessage("");

    if (!navigateurCompatible()) {
      setEtat("non-supporte");
      setMessage(
        "Ce navigateur ne prend pas en charge les notifications Push.",
      );
      return;
    }

    if (etat === "active") {
      setMessage(
        "Les notifications sont déjà activées sur cet appareil.",
      );
      return;
    }

    setEtat("activation");

    try {
      const autorisation =
        await Notification.requestPermission();

      if (autorisation !== "granted") {
        setEtat("refusee");
        setMessage(
          "L’autorisation a été refusée. Modifiez les permissions du site dans le navigateur.",
        );
        return;
      }

      const clePublique =
        process.env
          .NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!clePublique) {
        throw new Error(
          "Clé VAPID publique absente.",
        );
      }

      const inscription =
        await navigator.serviceWorker.register(
          "/sw.js",
          {
            scope: "/",
          },
        );

      await navigator.serviceWorker.ready;

      let abonnement =
        await inscription.pushManager.getSubscription();

      if (!abonnement) {
        abonnement =
          await inscription.pushManager.subscribe(
            {
              userVisibleOnly: true,
              applicationServerKey:
                convertirCleVapid(
                  clePublique,
                ) as BufferSource,
            },
          );
      }

      const reponse = await fetch(
        "/api/notifications/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            subscription:
              abonnement.toJSON(),

            plateforme:
              navigator.platform ||
              navigator.userAgent,
          }),
        },
      );

      let donnees: ReponseApi = {};

      try {
        donnees =
          (await reponse.json()) as ReponseApi;
      } catch {
        donnees = {};
      }

      if (
        !reponse.ok ||
        !donnees.succes
      ) {
        throw new Error(
          donnees.message ||
            "Impossible d’enregistrer l’appareil.",
        );
      }

      setEtat("active");
      setMessage(
        donnees.message ||
          "Notifications activées.",
      );
    } catch (error) {
      console.error(
        "Erreur activation notifications :",
        error,
      );

      setEtat("erreur");
      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’activer les notifications.",
      );
    }
  }

  const estActive = etat === "active";
  const estEnCours =
    etat === "activation" ||
    etat === "verification";

  const titre =
    etat === "non-supporte"
      ? "Notifications non compatibles"
      : etat === "refusee"
        ? "Notifications refusées"
        : estActive
          ? "Notifications activées"
          : "Activer les notifications";

  return (
    <>
      <button
        type="button"
        onClick={activerNotifications}
        disabled={
          estEnCours ||
          etat === "non-supporte"
        }
        aria-label={titre}
        title={titre}
        className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white text-neutral-800 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        <span
          className={[
            "absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white",
            estActive
              ? "bg-green-500"
              : etat === "refusee" ||
                  etat === "erreur"
                ? "bg-red-500"
                : "bg-orange-500",
          ].join(" ")}
        />
      </button>

      {message && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-black/10 bg-neutral-950 px-5 py-4 text-sm font-bold leading-6 text-white shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <p>{message}</p>

            <button
              type="button"
              onClick={() =>
                setMessage("")
              }
              className="shrink-0 text-lg text-neutral-400 hover:text-white"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}