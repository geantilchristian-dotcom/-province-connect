"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

type QrCodeImageProps = {
  valeur: string;
  taille?: number;
  className?: string;
  alt?: string;
};

export default function QrCodeImage({
  valeur,
  taille = 180,
  className = "",
  alt = "QR code de vérification",
}: QrCodeImageProps) {
  const [imageQr, setImageQr] = useState("");
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let composantActif = true;

    async function genererQrCode() {
      if (!valeur.trim()) {
        setImageQr("");
        setErreur(false);
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
          setErreur(false);
        }
      } catch {
        if (composantActif) {
          setImageQr("");
          setErreur(true);
        }
      }
    }

    genererQrCode();

    return () => {
      composantActif = false;
    };
  }, [valeur, taille]);

  if (erreur) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-red-50 text-center text-xs font-extrabold text-red-700 ${className}`}
        style={{
          width: taille,
          height: taille,
        }}
      >
        QR indisponible
      </div>
    );
  }

  if (!imageQr) {
    return (
      <div
        className={`flex animate-pulse items-center justify-center rounded-xl bg-neutral-200 text-xs font-extrabold text-neutral-500 ${className}`}
        style={{
          width: taille,
          height: taille,
        }}
      >
        Génération...
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