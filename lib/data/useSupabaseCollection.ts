"use client";

import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { createClient } from "../supabase/client";

export type ProvinceTable =
  | "personnes"
  | "activites"
  | "cartes"
  | "taxes"
  | "paiements"
  | "recus"
  | "communiques";

type LigneCollection<T> = {
  id: string;
  data: T;
  updated_at: string | null;
};

type OptionsCollection<T extends { id: string }> = {
  table: ProvinceTable;
  items: T[];
  setItems: Dispatch<SetStateAction<T[]>>;
  localStorageKey?: string;
  readOnly?: boolean;
  normaliser?: (items: T[]) => T[];
  onError?: (message: string) => void;
  onReadyChange?: (ready: boolean) => void;
};

function creerEmpreinte<T>(valeur: T) {
  return JSON.stringify(valeur);
}

function convertirLignes<T extends { id: string }>(
  lignes: LigneCollection<T>[] | null,
) {
  return (lignes || [])
    .map((ligne) => ligne.data)
    .filter(
      (item): item is T =>
        Boolean(item && typeof item.id === "string"),
    );
}

function lireAnciennesDonnees<T extends { id: string }>(
  cle?: string,
) {
  if (!cle || typeof window === "undefined") {
    return [] as T[];
  }

  try {
    const valeur = window.localStorage.getItem(cle);

    if (!valeur) {
      return [] as T[];
    }

    const donnees = JSON.parse(valeur);

    return Array.isArray(donnees)
      ? (donnees as T[]).filter(
          (item) => item && typeof item.id === "string",
        )
      : [];
  } catch {
    return [] as T[];
  }
}

export function useSupabaseCollection<
  T extends { id: string },
>({
  table,
  items,
  setItems,
  localStorageKey,
  readOnly = false,
  normaliser,
  onError,
  onReadyChange,
}: OptionsCollection<T>) {
  const supabase = useMemo(() => createClient(), []);

  const pretRef = useRef(false);
  const ignorerProchaineSynchronisationRef = useRef(false);
  const instantaneRef = useRef(new Map<string, string>());
  const minuterieRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const normaliserRef = useRef(normaliser);
  const erreurRef = useRef(onError);
  const pretCallbackRef = useRef(onReadyChange);

  useEffect(() => {
    normaliserRef.current = normaliser;
    erreurRef.current = onError;
    pretCallbackRef.current = onReadyChange;
  }, [normaliser, onError, onReadyChange]);

  useEffect(() => {
    let actif = true;

    async function chargerDepuisSupabase(
      autoriserMigrationLocale: boolean,
    ) {
      const { data, error } = await supabase
        .from(table)
        .select("id, data, updated_at")
        .order("updated_at", {
          ascending: false,
          nullsFirst: false,
        });

      if (!actif) {
        return;
      }

      if (error) {
        erreurRef.current?.(
          `Impossible de charger les données ${table} depuis Supabase : ${error.message}`,
        );
        pretRef.current = true;
        pretCallbackRef.current?.(true);
        return;
      }

      let donnees = convertirLignes<T>(
        data as LigneCollection<T>[] | null,
      );

      if (
        autoriserMigrationLocale &&
        donnees.length === 0 &&
        localStorageKey
      ) {
        const anciennesDonnees =
          lireAnciennesDonnees<T>(localStorageKey);

        if (anciennesDonnees.length > 0) {
          const lignesMigration = anciennesDonnees.map((item) => ({
            id: item.id,
            data: item,
            updated_at: new Date().toISOString(),
          }));

          const { error: erreurMigration } = await supabase
            .from(table)
            .upsert(lignesMigration, {
              onConflict: "id",
            });

          if (!erreurMigration) {
            donnees = anciennesDonnees;

            try {
              window.localStorage.removeItem(localStorageKey);
            } catch {
              // Le retrait du cache local n'empêche pas la migration.
            }
          } else {
            erreurRef.current?.(
              `La migration des anciennes données ${table} a échoué : ${erreurMigration.message}`,
            );
          }
        }
      }

      const donneesNormalisees = normaliserRef.current
        ? normaliserRef.current(donnees)
        : donnees;

      const instantane = new Map<string, string>();

      donneesNormalisees.forEach((item) => {
        instantane.set(item.id, creerEmpreinte(item));
      });

      instantaneRef.current = instantane;
      ignorerProchaineSynchronisationRef.current = true;
      setItems(donneesNormalisees);

      pretRef.current = true;
      pretCallbackRef.current?.(true);

      if (
        !readOnly &&
        creerEmpreinte(donneesNormalisees) !==
          creerEmpreinte(donnees)
      ) {
        await supabase.from(table).upsert(
          donneesNormalisees.map((item) => ({
            id: item.id,
            data: item,
            updated_at: new Date().toISOString(),
          })),
          {
            onConflict: "id",
          },
        );
      }
    }

    pretCallbackRef.current?.(false);
    void chargerDepuisSupabase(true);

    const canal = supabase
      .channel(`province-connect-${table}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        () => {
          void chargerDepuisSupabase(false);
        },
      )
      .subscribe();

    return () => {
      actif = false;

      if (minuterieRef.current) {
        clearTimeout(minuterieRef.current);
      }

      void supabase.removeChannel(canal);
    };
  }, [localStorageKey, readOnly, setItems, supabase, table]);

  useEffect(() => {
    if (!pretRef.current || readOnly) {
      return;
    }

    if (ignorerProchaineSynchronisationRef.current) {
      ignorerProchaineSynchronisationRef.current = false;
      return;
    }

    if (minuterieRef.current) {
      clearTimeout(minuterieRef.current);
    }

    minuterieRef.current = setTimeout(() => {
      const prochainInstantane = new Map<string, string>();
      const elementsAEnregistrer: T[] = [];

      items.forEach((item) => {
        const empreinte = creerEmpreinte(item);
        prochainInstantane.set(item.id, empreinte);

        if (instantaneRef.current.get(item.id) !== empreinte) {
          elementsAEnregistrer.push(item);
        }
      });

      const identifiantsASupprimer = [
        ...instantaneRef.current.keys(),
      ].filter((id) => !prochainInstantane.has(id));

      if (
        elementsAEnregistrer.length === 0 &&
        identifiantsASupprimer.length === 0
      ) {
        instantaneRef.current = prochainInstantane;
        return;
      }

      const ancienInstantane = instantaneRef.current;
      instantaneRef.current = prochainInstantane;

      void (async () => {
        if (elementsAEnregistrer.length > 0) {
          const { error } = await supabase.from(table).upsert(
            elementsAEnregistrer.map((item) => ({
              id: item.id,
              data: item,
              updated_at: new Date().toISOString(),
            })),
            {
              onConflict: "id",
            },
          );

          if (error) {
            instantaneRef.current = ancienInstantane;
            erreurRef.current?.(
              `Impossible d'enregistrer les données ${table} : ${error.message}`,
            );
            return;
          }
        }

        if (identifiantsASupprimer.length > 0) {
          const { error } = await supabase
            .from(table)
            .delete()
            .in("id", identifiantsASupprimer);

          if (error) {
            instantaneRef.current = ancienInstantane;
            erreurRef.current?.(
              `Impossible de supprimer les données ${table} : ${error.message}`,
            );
          }
        }
      })();
    }, 180);

    return () => {
      if (minuterieRef.current) {
        clearTimeout(minuterieRef.current);
      }
    };
  }, [items, readOnly, supabase, table]);
}
