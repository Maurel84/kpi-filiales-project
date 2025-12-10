import React from 'react'
import { supabase } from '../lib/supabase'

type OppRow = {
  id?: string
  marque: string | null
  modele: string | null
  gamme: string | null
  pays: string | null
  vendeur: string | null
  statut: string | null
  priorite: string | null
  source: string | null
}

export const OpportunitiesTable: React.FC = () => {
  const [rows, setRows] = React.useState<OppRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = async () => {
    if (!supabase) {
      setError('Supabase non configure. Verifiez VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('opportunities')
      .select('id,marque,modele,gamme,pays,vendeur,statut,priorite,source')
      .order('pays', { ascending: true })
      .order('marque', { ascending: true })
      .order('modele', { ascending: true })
      .limit(500)

    if (error) {
      console.error(error)
      setError('Impossible de charger les opportunites.')
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  React.useEffect(() => {
    load()
  }, [])

  if (!supabase) {
    return (
      <div className="text-sm text-amber-300 bg-amber-900/30 border border-amber-800 px-3 py-2 rounded-xl">
        Supabase non configure. Verifiez .env puis relancez.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">Opportunites (limite 500)</div>
        <button
          onClick={load}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 transition"
          disabled={loading}
        >
          Rafraichir
        </button>
      </div>
      {error && (
        <div className="text-sm text-rose-400 bg-rose-950/30 border border-rose-900 px-3 py-2 rounded-xl">
          {error}
        </div>
      )}
      <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/90">
            <tr className="text-left text-slate-300">
              <th className="px-4 py-3 font-semibold">Pays</th>
              <th className="px-4 py-3 font-semibold">Marque</th>
              <th className="px-4 py-3 font-semibold">Modele</th>
              <th className="px-4 py-3 font-semibold">Gamme</th>
              <th className="px-4 py-3 font-semibold">Vendeur</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Priorite</th>
              <th className="px-4 py-3 font-semibold">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map(r => (
              <tr key={r.id || `${r.pays}-${r.marque}-${r.modele}-${r.vendeur}`}>
                <td className="px-4 py-3 text-slate-100">{r.pays || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.marque || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.modele || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.gamme || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.vendeur || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.statut || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.priorite || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.source || '-'}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={8}>
                  Aucune opportunite.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <div className="px-4 py-6 text-center text-slate-300">Chargement des opportunites...</div>}
      </div>
    </div>
  )
}
