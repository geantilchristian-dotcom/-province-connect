/* Province Connect — Service Worker des notifications Push */

const NOTIFICATION_PAR_DEFAUT = {
  title: "Province Connect",
  body: "Une nouvelle information est disponible.",
  url: "/",
  tag: "province-connect-information",
};

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let donnees = {
    ...NOTIFICATION_PAR_DEFAUT,
  };

  if (event.data) {
    try {
      donnees = {
        ...donnees,
        ...event.data.json(),
      };
    } catch {
      const texte = event.data.text();

      if (texte) {
        donnees.body = texte;
      }
    }
  }

  const titre =
    typeof donnees.title === "string" &&
    donnees.title.trim()
      ? donnees.title.trim()
      : NOTIFICATION_PAR_DEFAUT.title;

  const options = {
    body:
      typeof donnees.body === "string" &&
      donnees.body.trim()
        ? donnees.body.trim()
        : NOTIFICATION_PAR_DEFAUT.body,

    icon:
      typeof donnees.icon === "string" &&
      donnees.icon
        ? donnees.icon
        : "/favicon.ico",

    tag:
      typeof donnees.tag === "string" &&
      donnees.tag
        ? donnees.tag
        : NOTIFICATION_PAR_DEFAUT.tag,

    renotify: Boolean(donnees.renotify),

    requireInteraction: Boolean(
      donnees.requireInteraction
    ),

    data: {
      url:
        typeof donnees.url === "string" &&
        donnees.url
          ? donnees.url
          : NOTIFICATION_PAR_DEFAUT.url,
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      titre,
      options
    )
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const urlDemandee =
      event.notification.data?.url || "/";

    const urlAbsolue = new URL(
      urlDemandee,
      self.location.origin
    ).href;

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then(async (fenetres) => {
          for (const fenetre of fenetres) {
            const urlFenetre =
              new URL(fenetre.url);

            if (
              urlFenetre.origin ===
              self.location.origin
            ) {
              await fenetre.focus();

              if (
                "navigate" in fenetre &&
                fenetre.url !== urlAbsolue
              ) {
                await fenetre.navigate(
                  urlAbsolue
                );
              }

              return;
            }
          }

          return self.clients.openWindow(
            urlAbsolue
          );
        })
    );
  }
);