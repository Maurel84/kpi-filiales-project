import React from 'react'
import { supabase } from '../lib/supabase'

type Row = { id?: string; kpi_id: string; objectif: number; realise: number }

export const KPIEditor: React.FC<{ filiale: string; year: number; month: number }> = ({
  filiale,
  year,
  month
}) => {
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [savingRow, setSavingRow] = React.useState<string | null>(null)

  const load = async () => {
    if (!supabase) {
      setError('Supabase non configure (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
      setRows([])
      return
    }
    if (!filiale) {
      setRows([])
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('kpi_values')
      .select('id,kpi_id,objectif,realise')
      .eq('filiale_code', filiale)
      .eq('year', year)
      .eq('month', month)

    if (error) {
      console.error(error)
      setError('Impossible de charger les KPI pour cette periode.')
      setRows([])
    } else {
      setRows(
        (data || []).map((r: any) => ({
          id: r.id,
          kpi_id: r.kpi_id,
          objectif: Number(r.objectif || 0),
          realise: Number(r.realise || 0)
        }))
      )
    }
    setLoading(false)
  }

  React.useEffect(() => {
    load()
  }, [filiale, year, month])

  const handleLocalChange = (kpi_id: string, field: 'objectif' | 'realise', value: number) => {
    setRows(prev => prev.map(row => (row.kpi_id === kpi_id ? { ...row, [field]: value } : row)))
  }

  const upsert = async (row: Row) => {
    if (!supabase) {
      setError('Supabase non configure (variables manquantes).')
      return
    }
    if (!filiale) {
      setError('Selectionnez une filiale avant de saisir des KPI.')
      return
    }
    setSavingRow(row.kpi_id)
    setError(null)

    const payload = {
      filiale_code: filiale,
      year,
      month,
      kpi_id: row.kpi_id,
      objectif: row.objectif,
      realise: row.realise,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('kpi_values')
      .upsert(payload, { onConflict: ['filiale_code', 'year', 'month', 'kpi_id'] })

    if (error) {
      console.error(error)
      setError('Erreur lors de la sauvegarde du KPI.')
    }

    setSavingRow(null)
    await load()
  }

  const rowsEmpty = !rows.length && !loading && filiale

  if (!supabase) {
    return (
      <div className="text-sm text-amber-300 bg-amber-900/30 border border-amber-800 px-3 py-2 rounded-xl">
        Supabase non configure (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Verifiez .env puis relancez le serveur.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-slate-400">
          Mettez a jour les objectifs et realises puis cliquez sur « Sauver ».
        </div>
        <button
          onClick={load}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 transition"
        >
          Rafraichir
        </button>
      </div>

      {error && (
        <div className="text-sm text-rose-400 bg-rose-950/30 border border-rose-900 px-3 py-2 rounded-xl">
          {error}
        </div>
      )}
      {!filiale && (
        <div className="text-sm text-amber-300 bg-amber-900/30 border border-amber-800 px-3 py-2 rounded-xl">
          Selectionnez une filiale pour charger les KPI.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/90">
            <tr className="text-left text-slate-300">
              <th className="px-4 py-3 font-semibold">KPI</th>
              <th className="px-4 py-3 font-semibold">Objectif</th>
              <th className="px-4 py-3 font-semibold">Realise</th>
              <th className="px-4 py-3 font-semibold w-36 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map(r => (
              <tr key={r.kpi_id} className="hover:bg-slate-800/40 transition">
                <td className="px-4 py-3 font-medium text-slate-100">{r.kpi_id}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={r.objectif}
                    onChange={e => handleLocalChange(r.kpi_id, 'objectif', Number(e.target.value || 0))}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={r.realise}
                    onChange={e => handleLocalChange(r.kpi_id, 'realise', Number(e.target.value || 0))}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => upsert(r)}
                    className="px-3 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition disabled:opacity-60"
                    disabled={savingRow === r.kpi_id}
                  >
                    {savingRow === r.kpi_id ? 'Sauvegarde...' : 'Sauver'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <div className="px-4 py-6 text-center text-slate-300">Chargement des KPI...</div>}

        {rowsEmpty && (
          <div className="px-4 py-6 text-center text-slate-400">
            Aucun KPI trouve pour cette filiale et periode.
          </div>
        )}
      </div>
    </div>
  )
}
