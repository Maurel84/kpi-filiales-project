# KPI Filiales - Scaffold

1. Copier `.env.example` vers `.env` et remplir VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
2. Installer les dépendances: `npm install`
3. Lancer en local: `npm run dev`

Configurer Supabase:
- Créer tables, RLS et seeds via SQL Editor.

Configurer Power BI:
- Créer un rapport, publier, récupérer l'URL Secure Embed et la mettre dans `VITE_PBI_EMBED_URL`.
