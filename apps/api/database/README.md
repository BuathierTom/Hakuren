# Base de données

`schema.sql` définit le modèle initial. Il s’exécute une seule fois dans une base vide, sélectionnée dans ton client SQL. Il ne crée pas de base et ne supprime pas de données.

Cible : MySQL 8.0.16+ ; validation locale sur MariaDB 12. Les tables utilisent InnoDB et `utf8mb4_unicode_ci`.

## Organisation

| Ensemble | Tables principales | Rôle |
| --- | --- | --- |
| Provenance | `data_sources`, `source_records`, `variant_source_links` | Sources versionnées, données brutes, correspondances à vérifier ou mises en quarantaine |
| Personnages | `characters`, `character_names`, `player_variants`, `variant_components` | Identité, noms et alias par langue, variantes et participants aux fusions |
| Historique | `works`, `variant_appearances`, `historical_teams`, `appearance_teams` | Apparitions et anciennes équipes dans chaque œuvre |
| Catalogue | `rarities`, `variant_rarities`, `game_contexts`, `techniques`, `variant_learnsets`, `learnset_rarities` | Raretés documentées, techniques et pouvoirs, disponibilité selon le jeu et le mode |
| Paramètres | `player_stat_profiles`, `technique_stat_profiles` | Valeurs selon le contexte, le profil, le niveau et la rareté |
| Utilisateurs | `users`, `user_collection` | Identifiant Discord, personnages possédés et wishlist |
| Compositions | `formations`, `formation_positions`, `squads`, `squad_players`, `squad_player_techniques`, `squad_staff` | Disposition, titulaires, remplaçants, techniques sélectionnées et encadrement |

Les tables `variant_external_ids` et `technique_external_ids` relient les identifiants internes aux identifiants de chaque source. Les différentes versions d’une même fiche externe peuvent ainsi garder une identité interne stable.

## Conventions

- Un personnage peut avoir plusieurs variantes. `character_id` reste vide tant que le rapprochement n’est pas établi ; le nom seul n’est pas une clé.
- L’œuvre d’origine est distincte des apparitions. Une ancienne équipe est reliée à une apparition précise, jamais déduite d’une liste d’équipes agrégée.
- `techniques` contient aussi les esprits guerriers, Mixi Max et totems, distingués par catégorie. Leurs valeurs sont attachées à un contexte, sans mélanger les jeux.
- Le contexte associe une œuvre, un mode et une version. La rareté est un axe distinct. `profile_key` identifie un profil documenté dans ce contexte, par exemple `base-lv50`.
- Les paramètres inconnus restent `NULL`. Les drapeaux source des techniques restent disponibles ; chemin alternatif et restriction BASARA sont des champs distincts, éventuellement inconnus.
- `variant_rarities` contient uniquement les disponibilités établies. Une absence signifie « non documenté ». Une composition ne peut sélectionner qu’une paire variante/rareté présente dans ce catalogue.
- `rarity_scope` distingue une disponibilité inconnue, sans restriction, ou limitée à la liste `learnset_rarities`. Une liste vide ne suffit pas à conclure qu’une technique est utilisable.
- La collection suit les variantes, sans compter les exemplaires ou leurs raretés. Possession et wishlist sont indépendantes et peuvent être cochées simultanément.
- Une composition appartient à un utilisateur et peut être un brouillon incomplet. Un même emplacement ou une même variante ne peut pas y être enregistré deux fois. Les coordonnées de formation sont des pourcentages.
- Les identifiants Discord sont des chaînes. Aucun mot de passe ou jeton Discord n’est stocké dans ce modèle.

L’import devra renseigner `source_record_id` pour chaque donnée importée et publier uniquement les correspondances vérifiées pour le périmètre concerné. Les sources ambiguës restent dans `source_records` ; elles ne deviennent pas automatiquement des fiches ou des techniques disponibles. Les références de provenance restent facultatives pour les données saisies manuellement.

Les contrôles qui portent sur plusieurs lignes seront ajoutés aux services de composition : droits du propriétaire, contexte et rareté des techniques, rôles de l’encadrement, complétude de la formation et limites HERO/BASARA. Ils devront être effectués dans les transactions de sauvegarde. L’authentification Discord et l’import du catalogue sont des étapes suivantes.
