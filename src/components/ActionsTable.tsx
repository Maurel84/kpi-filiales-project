import React from 'react'
import { supabase } from '../lib/supabase'

type ActionRow = {
  id?: string
  date_action: string | null
  action: string | null
  priorite: string | null
  responsable: string | null
  date_fin_prevue: string | null
  statut: string | null
  commentaires: string | null
}

export const ActionsTable: React.FC = () => {
  const [rows, setRows] = React.useState<ActionRow[]>([])
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
      .from('actions')
      .select('id,date_action,action,priorite,responsable,date_fin_prevue,statut,commentaires')
      .order('date_action', { ascending: false })
      .limit(200)

    if (error) {
      console.error(error)
      setError('Impossible de charger le plan d action.')
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
        <div className="text-sm text-slate-400">Plan d action (limite 200)</div>
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
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Action</th>
              <th className="px-4 py-3 font-semibold">Priorite</th>
              <th className="px-4 py-3 font-semibold">Responsable</th>
              <th className="px-4 py-3 font-semibold">Date fin prevue</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Commentaires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map(r => (
              <tr key={r.id || `${r.date_action}-${r.action}-${r.responsable}`}>
                <td className="px-4 py-3 text-slate-100">{r.date_action || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.action || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.priorite || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.responsable || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.date_fin_prevue || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.statut || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.commentaires || '-'}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={7}>
                  Aucune action.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <div className="px-4 py-6 text-center text-slate-300">Chargement du plan d action...</div>}
      </div>
    </div>
  )
}
