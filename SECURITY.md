# Sécurité — RACINES

Les données familiales sont **ultra-sensibles** (filiations, mineurs, téléphones,
localisations). La sécurité n'est pas une option ajoutée après coup : elle est
portée par la **base de données** (Row Level Security), pas par le front.

## Principe central : isolation par famille (RLS)

Chaque ligne porte un `family_id`. Des **policies RLS Postgres** garantissent
qu'un utilisateur ne peut lire/écrire **que** les données des familles dont il est
membre — appliqué par la base, donc **incontournable**, même en appelant l'API
Supabase directement avec la clé anon.

- `is_family_member(family_id)` → lecture/écriture courante
- `is_trusted_member(family_id)` → coordonnées sensibles (téléphone, email, adresse)
- `is_family_guardian(family_id)` → suppression / modération / gestion des membres

## Mesures en place (schéma `supabase/migrations/0001_init.sql`)

| Risque | Protection |
|---|---|
| Une famille voit une autre | RLS sur **toutes** les tables, filtrée par `family_id` |
| Fuite de téléphones/adresses | Table `person_contacts` séparée, réservée aux **membres de confiance** (pas les invités) |
| Mineurs | Flag `is_minor`, coordonnées hors de portée des non-gardiens |
| Auto-inscription sauvage | Adhésion uniquement via **invitation à token** (unique, expirant 7 j) → RPC `redeem_invitation` |
| Falsification de l'historique | `audit_log` **append-only** (aucune policy update/delete) |
| Suppression abusive | `delete` réservé aux **gardiens** |
| Mots de passe | Gérés par **Supabase Auth** (hachés côté serveur), jamais dans le client |
| Photos indexables | Bucket Storage **privé** + URLs signées (voir fin du SQL) |
| Vol de clé serveur | `service_role` **jamais** côté client ; seul l'`anon key` (public, protégé par RLS) est livré |

## Brancher le backend (3 étapes)

1. **SQL** : Dashboard Supabase → *SQL Editor* → coller `supabase/migrations/0001_init.sql` → *Run*.
   Puis le bloc Storage commenté en fin de fichier pour le bucket privé `photos`.
2. **Auth** : *Authentication → Providers* → activer Email (et OAuth/OTP SMS si voulu).
3. **Clés** : *Project Settings → API* → copier **Project URL** et **anon public key**
   dans `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), puis relancer `npm run dev`.

Tant que `.env.local` est vide, l'app tourne en **mode démo local** (aucune donnée réelle).

## Reste à faire (prochaines itérations)

- Migrer la couche données (zustand → Supabase) page par page, en testant la RLS.
- `Content-Security-Policy` stricte dans `index.html`.
- Rate-limiting / captcha sur login et **OTP SMS** (coûteux, cible de brute-force).
- RGPD : parcours de **suppression de compte** (droit à l'oubli) ; l'**export** existe déjà (GEDCOM).
- Consentement explicite avant d'ajouter un proche vivant avec ses coordonnées.

## Règles d'or

- Ne **jamais** committer `.env.local` (déjà couvert par `.gitignore` via `*.local`).
- Ne **jamais** mettre la `service_role` key dans le front ni dans un dépôt.
- L'`anon key` est **publique** par conception — la sécurité vient de la RLS, pas du secret de la clé.
