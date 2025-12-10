import React from 'react'
import { useAuth } from './auth'
import { LoginForm } from './components/LoginForm'
import { KPIEditor } from './components/KPIEditor'
import { PowerBIPage } from './components/PowerBIPage'
import { BudgetsTable } from './components/BudgetsTable'
import { OpportunitiesTable } from './components/OpportunitiesTable'
import { ForecastTable } from './components/ForecastTable'
import { ActionsTable } from './components/ActionsTable'

type TabId = 'saisie' | 'analyse' | 'budgets' | 'opps' | 'forecast' | 'actions'

const tabs: { id: TabId; label: string }[] = [
  { id: 'saisie', label: 'Saisie' },
  { id: 'analyse', label: 'Analyse (Power BI)' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'opps', label: 'Opportunites' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'actions', label: 'Plan d action' }
]

const App: React.FC = () => {
  const { user, loading, error, login, logout } = useAuth()
  const [filiale, setFiliale] = React.useState<string>(user?.filiale_code || '')
  const [month, setMonth] = React.useState<number>(new Date().getMonth() + 1)
  const [year, setYear] = React.useState<number>(new Date().getFullYear())
  const [tab, setTab] = React.useState<TabId>('saisie')

  const canEditFiliale = user?.role === 'MANAGER_GENERAL'
  const roleLabel =
    user?.role === 'MANAGER_GENERAL'
      ? 'Manager general'
      : user?.role === 'MANAGER_FILIALE'
        ? 'Manager filiale'
        : 'Utilisateur'

  React.useEffect(() => {
    if (user) setFiliale(user.filiale_code || '')
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="text-lg text-center space-y-2">
          <div>Chargement...</div>
          {error && <div className="text-sm text-amber-300">{error}</div>}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-sm p-8 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl backdrop-blur">
          <h2 className="text-xl mb-2 font-semibold">Portail KPI</h2>
          <p className="text-sm text-slate-400 mb-6">
            Connectez-vous pour acceder aux saisies et aux analyses.
          </p>
          {error && <div className="mb-3 text-sm text-amber-300">{error}</div>}
          <LoginForm onLogin={login} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">KPI Filiales</p>
            <h1 className="text-3xl font-semibold">Pilotage & Analyse</h1>
            <p className="text-sm text-slate-400">
              Suivez vos indicateurs, budgets, opportunites et forecast.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl px-4 py-2 shadow-lg">
              <div className="text-xs text-slate-400">Connecte</div>
              <div className="font-semibold">{user.display_name || user.email}</div>
              <div className="text-xs text-indigo-300">
                {roleLabel} {user.filiale_code ? `· Filiale ${user.filiale_code}` : '· Toutes filiales'}
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:translate-y-[-1px] transition"
            >
              Deconnexion
            </button>
          </div>
        </header>

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <label className="text-xs uppercase tracking-wide text-slate-400">Filiale</label>
            <input
              value={filiale}
              disabled={!canEditFiliale}
              onChange={e => setFiliale(e.target.value)}
              className="mt-2 w-full rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-60"
              placeholder="Code filiale"
            />
            {!canEditFiliale && (
              <p className="text-[11px] text-slate-500 mt-1">Filiale verrouillee pour ce compte.</p>
            )}
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <label className="text-xs uppercase tracking-wide text-slate-400">Mois</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="mt-2 w-full rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <label className="text-xs uppercase tracking-wide text-slate-400">Annee</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="mt-2 w-full rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              min={2000}
              max={2100}
            />
          </div>
        </section>

        <nav className="mt-6">
          <div className="flex flex-wrap gap-2 bg-slate-900/80 border border-slate-800 rounded-full p-1 shadow-lg">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  tab === t.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <section className="mt-6 space-y-4">
          {tab === 'saisie' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Saisie des KPI</h3>
                  <p className="text-sm text-slate-400">
                    Filiale {filiale || '—'} · Mois {month} / {year}
                  </p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Mise a jour en direct
                </span>
              </div>
              <div className="p-6">
                <KPIEditor filiale={filiale} year={year} month={month} />
              </div>
            </div>
          )}

          {tab === 'analyse' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="text-lg font-semibold">Analyse Power BI</h3>
                <p className="text-sm text-slate-400">
                  Visualisation filtree par filiale, mois et annee selectionnes.
                </p>
              </div>
              <div className="p-2 rounded-3xl overflow-hidden">
                <PowerBIPage filiale={filiale} year={year} month={month} />
              </div>
            </div>
          )}

          {tab === 'budgets' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="text-lg font-semibold">Budgets (B2026)</h3>
                <p className="text-sm text-slate-400">
                  Lignes budgetaires par filiale, produit, plan compte et constructeur.
                </p>
              </div>
              <div className="p-4">
                <BudgetsTable filiale={filiale} year={year} />
              </div>
            </div>
          )}

          {tab === 'opps' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="text-lg font-semibold">Opportunites (LISTE)</h3>
                <p className="text-sm text-slate-400">
                  Marque, modele, pays, vendeur, statut, priorite.
                </p>
              </div>
              <div className="p-4">
                <OpportunitiesTable />
              </div>
            </div>
          )}

          {tab === 'forecast' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="text-lg font-semibold">Forecast</h3>
                <p className="text-sm text-slate-400">
                  Historique 2017-2024 et previsions 2026 par modele/code.
                </p>
              </div>
              <div className="p-4">
                <ForecastTable />
              </div>
            </div>
          )}

          {tab === 'actions' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="text-lg font-semibold">Plan d action</h3>
                <p className="text-sm text-slate-400">Actions, responsables, priorites et statuts.</p>
              </div>
              <div className="p-4">
                <ActionsTable />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default App
