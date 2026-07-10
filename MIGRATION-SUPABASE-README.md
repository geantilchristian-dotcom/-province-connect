# Province Connect — Pack Supabase Realtime

Ce pack remplace le stockage métier dans `localStorage` par Supabase pour :

- personnes ;
- activités ;
- cartes et permis ;
- taxes ;
- paiements ;
- reçus ;
- communiqués ;
- tableau de bord ;
- vérification publique des cartes et reçus.

## Ordre d'installation

1. Sauvegarder le projet actuel et la base Supabase.
2. Exécuter `supabase-migration-complete.sql` dans Supabase SQL Editor.
3. Remplacer les fichiers du projet par ceux de ce pack.
4. Conserver votre `.env.local` actuel : il n'est pas inclus dans le ZIP.
5. Exécuter :

```powershell
npm ci
npx tsc --noEmit
npm run build
```

6. Démarrer localement avec `npm run dev`.
7. Ouvrir chaque ancien module une première fois avec le compte administrateur qui avait les données locales. Le hook transfère les anciennes données dans Supabase si la table distante est vide, puis supprime la clé `localStorage` correspondante.
8. Tester avec deux navigateurs : une création ou modification doit apparaître automatiquement sur l'autre écran grâce à Supabase Realtime.
9. Envoyer le pack vers GitHub puis redéployer Render.

## Important

Les images sont encore conservées sous forme de texte Base64 dans les objets JSONB afin de préserver le fonctionnement actuel. Pour une production à grande échelle, il faudra ensuite déplacer les photos et affiches vers Supabase Storage.
