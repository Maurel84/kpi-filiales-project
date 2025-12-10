import React from 'react'
import { supabase } from '../lib/supabase'

type ForecastRow = {
  id?: string
  model: string | null
  code: string | null
  year: number | null
  month: number | null
  value: number | null
}

export const ForecastTable: React.FC = () => {
  const [rows, setRows] = React.useState<ForecastRow[]>([])
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
      .from('forecast')
      .select('id,model,code,year,month,value')
      .order('year', { ascending: true })
      .order('month', { ascending: true })
      .order('model', { ascending: true })
      .limit(500)

    if (error) {
      console.error(error)
      setError('Impossible de charger le forecast.')
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
        <div className="text-sm text-slate-400">Forecast (limite 500 lignes)</div>
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
              <th className="px-4 py-3 font-semibold">Model</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Annee</th>
              <th className="px-4 py-3 font-semibold">Mois</th>
              <th className="px-4 py-3 font-semibold">Valeur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map(r => (
              <tr key={r.id || `${r.model}-${r.code}-${r.year}-${r.month}`}>
                <td className="px-4 py-3 text-slate-100">{r.model || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.code || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.year ?? '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.month ?? '-'}</td>
                <td className="px-4 py-3 text-slate-100">{Number(r.value || 0).toLocaleString('fr-FR')}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={5}>
                  Aucun forecast.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <div className="px-4 py-6 text-center text-slate-300">Chargement du forecast...</div>}
      </div>
    </div>
  )
}
