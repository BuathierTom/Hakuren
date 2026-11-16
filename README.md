# KizunaDex

Encyclopédie des personnages, suivi de collection Victory Road et création d'équipes personnalisées.

React, TypeScript et SCSS côté frontend. Fastify et PostgreSQL (`pg`) côté backend.

## Démarrage

Prérequis : Node.js 24+, npm et PostgreSQL.

```sh
npm install
cp .env.example .env
```

Configurer `.env` avec les identifiants de ta base PostgreSQL et les ports souhaités :

```dotenv
FRONT_PORT=5173
API_PORT=3001
DATABASE_URL=postgresql://utilisateur:mot_de_passe@127.0.0.1:5432/kizunadex
```

```sh
npm run dev
```

Le frontend est accessible sur [localhost:5173](http://localhost:5173) par défaut.

## Commandes

| Commande | Action |
| --- | --- |
| `npm run dev` | Lancer le frontend et l'API |
| `npm run db:migrate` | Appliquer les migrations SQL |
| `npm run check` | Vérifier les types, les tests et la compilation |
| `npm run build` | Compiler le projet |

## Organisation

- `apps/web` : frontend. Styles communs dans `src/styles`, SCSS Modules à côté des composants.
- `apps/api` : backend et migrations SQL.
