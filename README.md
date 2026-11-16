# KizunaDex

Encyclopédie des personnages, suivi de collection Victory Road et création d'équipes personnalisées.

React, TypeScript et SCSS côté frontend. Fastify et MySQL (`mysql2`) côté backend.

## Démarrage

Prérequis : Node.js 24+, npm et MySQL.

```sh
npm install
cp .env.example .env
```

Configurer `.env` avec les identifiants de ta base MySQL et les ports souhaités :

```dotenv
FRONT_PORT=5173
API_PORT=3001
DATABASE_URL=mysql://utilisateur:mot_de_passe@127.0.0.1:3306/kizunadex
```

```sh
npm run dev
```

Le frontend est accessible sur [localhost:5173](http://localhost:5173) par défaut.

## Commandes

| Commande | Action |
| --- | --- |
| `npm run dev` | Lancer le frontend et l'API |
| `npm run check` | Vérifier les types, les tests et la compilation |
| `npm run build` | Compiler le projet |
| `npm run import:catalogue` | Importer le catalogue dans la base configurée |

Import : `--dry-run` pour prévisualiser, `--offline` pour utiliser le cache local, `--help` pour l’aide. Les options se passent après `--`.

## Organisation

- `apps/web` : frontend. Styles communs dans `src/styles`, SCSS Modules à côté des composants.
- `apps/api` : backend.
- `apps/api/database` : [schéma SQL](apps/api/database/schema.sql).
