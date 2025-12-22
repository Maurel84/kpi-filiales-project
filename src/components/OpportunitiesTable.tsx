import React from 'react'
import { supabase } from '../lib/supabase'
import { Opportunity } from '../types'

const MOCK_DATA: Opportunity[] = [
  {
    id: '1',
    date_creation: '2025-09-01',
    commercial: 'Jean Dupont',
    client: 'Société A',
    nom_projet: 'Projet Extension',
    marque: 'MANITOU',
    modele: 'MT-X 1840',
    quantite: 2,
    ca_potentiel: 150000,
    marge_previsionnelle_pourcent: 15,
    date_closing: '2025-12-15',
    statut: 'EN COURS',
    marque_concurrence: 'JCB',
    modele_concurrence: '540-170',
    prix_concurrence: 145000,
    commentaires: 'Négociation en cours sur le prix.'
  },
  {
    id: '2',
    date_creation: '2025-08-15',
    commercial: 'Alice Martin',
    client: 'Construction B',
    nom_projet: 'Renouvellement Parc',
    marque: 'KALMAR',
    modele: 'DRG450',
    quantite: 1,
    ca_potentiel: 300000,
    marge_previsionnelle_pourcent: 12,
    date_closing: '2025-10-01',
    statut: 'GAGNE',
    commentaires: 'Contrat signé.'
  },
  {
    id: '3',
    date_creation: '2025-09-10',
    commercial: 'Paul Durand',
    client: 'Logistique C',
    nom_projet: 'Nouvel Entrepôt',
    marque: 'MANITOU',
    modele: 'ME 425',
    quantite: 5,
    ca_potentiel: 125000,
    marge_previsionnelle_pourcent: 10,
    date_closing: '2025-09-30',
    statut: 'PERDU',
    marque_concurrence: 'TOYOTA',
    prix_concurrence: 120000,
    commentaires: 'Perdu sur le prix.'
  }
]

export const OpportunitiesTable: React.FC = () => {
  const [rows, setRows] = React.useState<Opportunity[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = async () => {
    // Try Supabase first (simulated)
    if (supabase) {
      setLoading(true)
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .limit(100)

      if (!error && data && data.length > 0) {
        setRows(data as unknown as Opportunity[]) // Type assertion or proper mapping needed slightly later
        setLoading(false)
        return
      }
    }

    // Fallback to Mock Data directly for demo purposes
    console.log('Using mock data for opportunities')
    setRows(MOCK_DATA)
    setLoading(false)
  }

  React.useEffect(() => {
    load()
  }, [])

  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [formData, setFormData] = React.useState<Partial<Opportunity>>({})

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate ID generation
    const newOp: Opportunity = {
      id: Math.random().toString(36).substr(2, 9),
      date_creation: new Date().toISOString().split('T')[0],
      commercial: 'Demo User', // Should come from Auth context ideally
      client: formData.client || '',
      nom_projet: formData.nom_projet || '',
      marque: formData.marque || '',
      modele: formData.modele || '',
      quantite: Number(formData.quantite || 1),
      ca_potentiel: Number(formData.ca_potentiel || 0),
      marge_previsionnelle_pourcent: Number(formData.marge_previsionnelle_pourcent || 0),
      date_closing: formData.date_closing || '',
      statut: (formData.statut as any) || 'EN COURS',
      commentaires: formData.commentaires || '',
      // Optional fields
      marque_concurrence: formData.marque_concurrence,
      prix_concurrence: formData.prix_concurrence ? Number(formData.prix_concurrence) : undefined
    }

    // Update local state (Mock DB)
    setRows([newOp, ...rows])
    setIsModalOpen(false)
    setFormData({})
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">Opportunités ({rows.length})</div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/20 transition"
          >
            + Nouvelle Affaire
          </button>
          <button
            onClick={load}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 transition text-slate-300"
            disabled={loading}
          >
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Modal Saisie */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <h3 className="text-lg font-semibold text-white">Nouvelle Opportunité</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase">Client</label>
                  <input
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nom du client"
                    value={formData.client || ''}
                    onChange={e => setFormData({ ...formData, client: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase">Projet</label>
                  <input
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nom du projet"
                    value={formData.nom_projet || ''}
                    onChange={e => setFormData({ ...formData, nom_projet: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase">Marque</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    value={formData.marque || ''}
                    onChange={e => setFormData({ ...formData, marque: e.target.value })}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="MANITOU">MANITOU</option>
                    <option value="KALMAR">KALMAR</option>
                    <option value="MASSEY FERGUSON">MASSEY FERGUSON</option>
                    <option value="DIVERS">DIVERS</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase">Modèle</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: MT-X 1840"
                    value={formData.modele || ''}
                    onChange={e => setFormData({ ...formData, modele: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    value={formData.quantite || 1}
                    onChange={e => setFormData({ ...formData, quantite: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase">CA Potentiel (€)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    value={formData.ca_potentiel || ''}
                    onChange={e => setFormData({ ...formData, ca_potentiel: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase">Marge (%)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    value={formData.marge_previsionnelle_pourcent || ''}
                    onChange={e => setFormData({ ...formData, marge_previsionnelle_pourcent: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase">Date Closing (Prévue)</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    value={formData.date_closing || ''}
                    onChange={e => setFormData({ ...formData, date_closing: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase">Statut</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    value={formData.statut || 'EN COURS'}
                    onChange={e => setFormData({ ...formData, statut: e.target.value as any })}
                  >
                    <option value="EN COURS">EN COURS</option>
                    <option value="GAGNE">GAGNE</option>
                    <option value="PERDU">PERDU</option>
                  </select>
                </div>
              </div>

              {/* Section Concurrence / Détails */}
              <div className="border-t border-slate-800 pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3 text-slate-300">Infos Concurrence & Commentaires</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase">Marque Concurrent</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: JCB, CAT..."
                      value={formData.marque_concurrence || ''}
                      onChange={e => setFormData({ ...formData, marque_concurrence: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 uppercase">Prix Concurrent</label>
                    <input
                      type="number"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Montant proposé"
                      value={formData.prix_concurrence || ''}
                      onChange={e => setFormData({ ...formData, prix_concurrence: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-slate-400 uppercase">Commentaires</label>
                    <textarea
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                      placeholder="Détails supplémentaires..."
                      value={formData.commentaires || ''}
                      onChange={e => setFormData({ ...formData, commentaires: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] transition"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg max-h-[600px]">
        <table className="min-w-full text-xs md:text-sm whitespace-nowrap">
          <thead className="bg-slate-900/90 sticky top-0 z-10 backdrop-blur-sm">
            <tr className="text-left text-slate-400 border-b border-slate-800">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Client / Projet</th>
              <th className="px-4 py-3 font-semibold">Produit</th>
              <th className="px-4 py-3 font-semibold text-right">CA Potentiel</th>
              <th className="px-4 py-3 font-semibold text-right">Marge %</th>
              <th className="px-4 py-3 font-semibold">Closing</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Commercial</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-800/50 transition">
                <td className="px-4 py-3 text-slate-300">{r.date_creation}</td>
                <td className="px-4 py-3">
                  <div className="text-slate-200 font-medium">{r.client}</div>
                  <div className="text-slate-500 text-xs">{r.nom_projet}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-indigo-300">{r.marque}</div>
                  <div className="text-slate-400 text-xs">{r.modele} (x{r.quantite})</div>
                </td>
                <td className="px-4 py-3 text-right text-slate-200 font-mono">
                  {r.ca_potentiel.toLocaleString()} €
                </td>
                <td className="px-4 py-3 text-right text-slate-300">
                  {r.marge_previsionnelle_pourcent}%
                </td>
                <td className="px-4 py-3 text-slate-300">{r.date_closing}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${r.statut === 'GAGNE' ? 'bg-emerald-500/20 text-emerald-400' :
                    r.statut === 'PERDU' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                    {r.statut}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{r.commercial}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="px-4 py-12 text-center text-slate-400 italic">Chargement...</div>}
      </div>
    </div>
  )
}
