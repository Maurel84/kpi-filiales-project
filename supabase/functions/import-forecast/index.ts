// Edge Function placeholder for importing FORECAST.csv using the service_role key.
// Required env vars (set in Supabase config, not in the frontend):
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - STORAGE_BUCKET (optional if reading from storage)
// - FORECAST_PATH (path to the CSV, e.g., 'FORECAST.csv')
// Note: This is a scaffold; adapt parsing/mapping to your schema before deploying.

// Edge Function: import-forecast
// Lit un CSV (FORECAST) depuis Storage ou un chemin fourni, et insère dans modeles_produits,
// historique_ventes_modeles, previsions_ventes_modeles.
// Variables d'environnement :
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - FORECAST_BUCKET (optionnel, défaut "imports")
// - FORECAST_PATH (optionnel, défaut "FORECAST.csv")
// Le CSV attendu : colonnes [Marque;Categorie;Modele;2017;...;2024;Jan;Fev;...;Dec]

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/std@0.204.0/csv/parse.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const bucket = Deno.env.get('FORECAST_BUCKET') || 'imports';
const defaultPath = Deno.env.get('FORECAST_PATH') || 'FORECAST.csv';

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing service role credentials');
}

const supabase = createClient(supabaseUrl, serviceKey);

async function loadCsv(path: string) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) {
    throw new Error(`Storage download error: ${error.message}`);
  }
  const text = await data.text();
  const records = parse(text, { skipFirstRow: false, separator: ';' }) as string[][];
  return records;
}

async function ensureMarque(marqueName: string) {
  const { data } = await supabase.from('marques').select('id').eq('nom', marqueName).maybeSingle();
  if (data?.id) return data.id;
  const insert = await supabase.from('marques').insert({ nom: marqueName, code: marqueName.slice(0, 8), actif: true }).select('id').single();
  if (insert.error) throw insert.error;
  return insert.data.id as string;
}

async function ensureModele(marqueId: string, categorie: string, modele: string) {
  const code = modele;
  const { data } = await supabase
    .from('modeles_produits')
    .select('id')
    .eq('code_modele', code)
    .maybeSingle();
  if (data?.id) return data.id;
  const insert = await supabase
    .from('modeles_produits')
    .insert({
      marque_id: marqueId,
      code_modele: code,
      nom_complet: `${categorie} ${modele}`.trim(),
      actif: true,
    })
    .select('id')
    .single();
  if (insert.error) throw insert.error;
  return insert.data.id as string;
}

async function importRow(row: string[]) {
  // Expected: Marque;Categorie;Modele;2017;2018;...;2024;Jan;Fev;...;Dec
  if (row.length < 20) return;
  const marqueName = row[0]?.trim();
  const categorie = row[1]?.trim();
  const modele = row[2]?.trim();
  if (!marqueName || !modele) return;

  const marqueId = await ensureMarque(marqueName);
  const modeleId = await ensureModele(marqueId, categorie, modele);

  const years = Array.from({ length: 8 }, (_, idx) => 2017 + idx);
  for (let i = 0; i < years.length; i++) {
    const qty = Number(row[3 + i] || 0);
    if (qty > 0) {
      await supabase.from('historique_ventes_modeles').upsert({
        modele_id: modeleId,
        code_modele: modele,
        annee: years[i],
        quantite_vendue: qty,
      });
    }
  }

  const months = ['Jan','Fev','Mar','Avr','Mai','Jui','Juil','Aou','Sep','Oct','Nov','Dec'];
  for (let i = 0; i < months.length; i++) {
    const qty = Number(row[3 + years.length + i] || 0);
    if (qty > 0) {
      await supabase.from('previsions_ventes_modeles').upsert({
        modele_id: modeleId,
        code_modele: modele,
        annee: 2026,
        mois: i + 1,
        quantite_prevue: qty,
        type_prevision: 'Forecast',
      });
    }
  }
}

export default async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    const source = body?.source || defaultPath;

    const rows = await loadCsv(source);
    for (const row of rows.slice(1)) {
      await importRow(row);
    }

    return new Response(JSON.stringify({ message: `Import terminé`, rows: rows.length }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
};
