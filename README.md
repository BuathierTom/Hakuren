# Hakuren

Encyclopédie des personnages, suivi de collection Victory Road et création d'équipes personnalisées.

React, TypeScript et SCSS côté frontend. Fastify et MySQL côté backend.

## Démarrage

```sh
npm install
cp .env.example .env
```

Configurer `.env` avec les identifiants de ta base MySQL et les ports souhaités :

```dotenv
FRONT_PORT=5173
API_PORT=3001
DATABASE_URL=mysql://utilisateur:mot_de_passe@127.0.0.1:3306/hakuren
```

```sh
npm run dev
```

Le frontend est accessible sur [localhost:5173](http://localhost:5173) par défaut.

## Commandes

| Commande                          | Action                                          |
| --------------------------------- | ----------------------------------------------- |
| `npm run dev`                     | Lancer le frontend et l'API                     |
| `npm run check`                   | Vérifier les types, les tests et la compilation |
| `npm run build`                   | Compiler le projet                              |
| `npm run format`                  | Formater le code et les styles                  |
| `npm run import:catalogue`        | Importer le catalogue dans la base configurée   |
| `npm run import:catalogue-extras` | Charger les passifs et les écussons des équipes |
| `npm run setup:teams`             | Préparer la sauvegarde des équipes par compte   |
| `npm run setup:auth`              | Préparer les tables de connexion Discord        |

## Organisation

- `apps/web/src` : `app` pour le démarrage, `pages` pour les pages, `components` pour l’interface commune et `features` pour les fonctionnalités.
- Styles globaux et motifs partagés dans `styles`, modules SCSS à côté des composants.
- `apps/api` : backend.
- `apps/api/database` : [schéma SQL](apps/api/database/schema.sql).

## Connexion Discord

Créer une application dans le [portail développeur Discord](https://discord.com/developers/applications), puis ajouter `${APP_URL}/api/auth/discord/callback` dans **OAuth2 → Redirects**.

Renseigner `APP_URL`, `DISCORD_CLIENT_ID` et `DISCORD_CLIENT_SECRET` dans `.env`, lancer `npm run setup:auth`, puis redémarrer `npm run dev`. `APP_URL` correspond à l’adresse exacte du frontend, port compris. Le compte Hakuren est créé à la première connexion.

Les équipes et le brouillon sont sauvegardés sur le compte connecté. Les anciennes équipes du navigateur peuvent être importées depuis « Mes équipes ».
