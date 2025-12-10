import React from 'react'
import { supabase } from '../lib/supabase'

type BudgetRow = {
  id?: string
  filiale_code: string
  year: number
  month: number
  produit: string | null
  plan_compte: string | null
  constructeur: string | null
  objectif: number | null
}

export const BudgetsTable: React.FC<{ filiale: string; year: number }> = ({ filiale, year }) => {
  const [rows, setRows] = React.useState<BudgetRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = async () => {
    if (!supabase) {
      setError('Supabase non configure. Verifiez VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.')
      return
    }
    if (!filiale) {
      setRows([])
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('budgets')
      .select('id,filiale_code,year,month,produit,plan_compte,constructeur,objectif')
      .eq('filiale_code', filiale)
      .eq('year', year)
      .order('produit', { ascending: true })
      .order('plan_compte', { ascending: true })
      .order('constructeur', { ascending: true })
      .order('month', { ascending: true })

    if (error) {
      console.error(error)
      setError('Impossible de charger les budgets.')
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  React.useEffect(() => {
    load()
  }, [filiale, year])

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
        <div className="text-sm text-slate-400">Budgets pour {filiale || '—'} · {year}</div>
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
              <th className="px-4 py-3 font-semibold">Produit</th>
              <th className="px-4 py-3 font-semibold">Plan compte</th>
              <th className="px-4 py-3 font-semibold">Constructeur</th>
              <th className="px-4 py-3 font-semibold">Mois</th>
              <th className="px-4 py-3 font-semibold">Objectif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map(r => (
              <tr key={r.id || `${r.filiale_code}-${r.year}-${r.month}-${r.plan_compte}-${r.constructeur}-${r.produit}`}>
                <td className="px-4 py-3 text-slate-100">{r.produit || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.plan_compte || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.constructeur || '-'}</td>
                <td className="px-4 py-3 text-slate-100">{r.month}</td>
                <td className="px-4 py-3 text-slate-100">{Number(r.objectif || 0).toLocaleString('fr-FR')}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={5}>
                  Aucun budget trouve pour cette filiale et annee.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <div className="px-4 py-6 text-center text-slate-300">Chargement des budgets...</div>}
      </div>
    </div>
  )
}
