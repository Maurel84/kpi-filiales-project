
import React from 'react'
import { Visit } from '../types'

const MOCK_VISITS: Visit[] = [
    {
        id: 'v1',
        date: '2025-09-02',
        client_nom: 'MARTIN',
        client_prenom: 'Pierre',
        client_fonction: 'Directeur Technique',
        client_telephone: '+33 6 12 34 56 78',
        client_email: 'p.martin@societe-a.com',
        opportunite_liee: 'Projet Extension',
        compte_rendu: 'Présentation de la gamme Manitou. Intéressé par le MT-X 1840.'
    },
    {
        id: 'v2',
        date: '2025-09-05',
        client_nom: 'DUBIOIS',
        client_prenom: 'Sophie',
        client_fonction: 'Responsable Achats',
        client_telephone: '+33 6 98 76 54 32',
        client_email: 's.dubois@construction-b.com',
        lost_sales_liee: 'Renouvellement Parc',
        compte_rendu: 'Négociation difficile. La concurrence est moins chère.'
    }
]

export const VisitsTable: React.FC = () => {
    const [rows, setRows] = React.useState<Visit[]>(MOCK_VISITS)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [formData, setFormData] = React.useState<Partial<Visit>>({})

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault()
        const newVisit: Visit = {
            id: Math.random().toString(36).substr(2, 9),
            date: formData.date || new Date().toISOString().split('T')[0],
            client_nom: formData.client_nom || '',
            client_prenom: formData.client_prenom || '',
            client_fonction: formData.client_fonction || '',
            client_telephone: formData.client_telephone || '',
            client_email: formData.client_email || '',
            compte_rendu: formData.compte_rendu || '',
            opportunite_liee: formData.opportunite_liee,
            lost_sales_liee: formData.lost_sales_liee
        }
        setRows([newVisit, ...rows])
        setIsModalOpen(false)
        setFormData({})
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-sm text-slate-400">Visites Clients ({rows.length})</div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/20 transition"
                >
                    + Saisir une visite
                </button>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                            <h3 className="text-lg font-semibold text-white">Compte-rendu de Visite</h3>
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
                                    <label className="text-xs text-slate-400 uppercase">Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                        value={formData.date || ''}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-1"></div>

                                <div className="border-t border-slate-800 col-span-2 my-2"></div>
                                <h4 className="col-span-2 text-sm font-medium text-slate-300">Contact</h4>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 uppercase">Nom</label>
                                    <input
                                        required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                        value={formData.client_nom || ''}
                                        onChange={e => setFormData({ ...formData, client_nom: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 uppercase">Prénom</label>
                                    <input
                                        required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                        value={formData.client_prenom || ''}
                                        onChange={e => setFormData({ ...formData, client_prenom: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 uppercase">Fonction</label>
                                    <input
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                        value={formData.client_fonction || ''}
                                        onChange={e => setFormData({ ...formData, client_fonction: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 uppercase">Téléphone</label>
                                    <input
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                        value={formData.client_telephone || ''}
                                        onChange={e => setFormData({ ...formData, client_telephone: e.target.value })}
                                    />
                                </div>

                                <div className="border-t border-slate-800 col-span-2 my-2"></div>
                                <h4 className="col-span-2 text-sm font-medium text-slate-300">Rapport</h4>

                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs text-slate-400 uppercase">Lier à une Opportunité (Optionnel)</label>
                                    <input
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Nom du projet ou ID..."
                                        value={formData.opportunite_liee || ''}
                                        onChange={e => setFormData({ ...formData, opportunite_liee: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs text-slate-400 uppercase">Compte-rendu</label>
                                    <textarea
                                        required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                                        placeholder="Sujets abordés, prochaines étapes..."
                                        value={formData.compte_rendu || ''}
                                        onChange={e => setFormData({ ...formData, compte_rendu: e.target.value })}
                                    />
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
                            <th className="px-4 py-3 font-semibold">Contact</th>
                            <th className="px-4 py-3 font-semibold">Coordonnées</th>
                            <th className="px-4 py-3 font-semibold">Contexte</th>
                            <th className="px-4 py-3 font-semibold w-1/3">Compte Rendu</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {rows.map(r => (
                            <tr key={r.id} className="hover:bg-slate-800/50 transition valign-top">
                                <td className="px-4 py-3 text-slate-300">{r.date}</td>
                                <td className="px-4 py-3">
                                    <div className="text-slate-200 font-medium">{r.client_prenom} {r.client_nom}</div>
                                    <div className="text-slate-500 text-xs">{r.client_fonction}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-slate-300 text-xs">{r.client_telephone}</div>
                                    <div className="text-indigo-300 text-xs">{r.client_email}</div>
                                </td>
                                <td className="px-4 py-3">
                                    {r.opportunite_liee && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 text-indigo-400">
                                            Opp: {r.opportunite_liee}
                                        </span>
                                    )}
                                    {r.lost_sales_liee && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400">
                                            Lost: {r.lost_sales_liee}
                                        </span>
                                    )}
                                    {!r.opportunite_liee && !r.lost_sales_liee && (
                                        <span className="text-slate-500 text-xs italic">Visite de courtoisie</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-slate-400 text-xs whitespace-normal max-w-sm leading-relaxed">
                                    {r.compte_rendu}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div >
    )
}
