import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Search, TrendingUp, Download } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Vente = Database['public']['Tables']['ventes']['Row'];

export function VentesView() {
  const { profile } = useAuth();
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadVentes();
  }, [profile, statusFilter]);

  const loadVentes = async () => {
    if (!profile) return;

    let query = supabase
      .from('ventes')
      .select('*')
      .order('date_vente', { ascending: false });

    if (profile.role !== 'admin_siege' && profile.filiale_id) {
      query = query.eq('filiale_id', profile.filiale_id);
    }

    if (statusFilter !== 'all') {
      query = query.eq('statut', statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setVentes(data);
    }

    setLoading(false);
  };

  const filteredVentes = ventes.filter(vente =>
    vente.client_nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vente.numero.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const badges = {
      Devis: 'bg-blue-100 text-blue-800',
      Commande: 'bg-amber-100 text-amber-800',
      Facturee: 'bg-emerald-100 text-emerald-800',
      Annulee: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Ventes</h1>
          <p className="text-slate-600">
            Gestion des ventes et commandes clients
          </p>
        </div>
        <button className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition shadow-lg hover:shadow-xl">
          <Plus className="w-5 h-5" />
          <span className="font-medium">Nouvelle vente</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par client ou numéro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="Devis">Devis</option>
            <option value="Commande">Commande</option>
            <option value="Facturee">Facturée</option>
            <option value="Annulee">Annulée</option>
          </select>

          <button className="flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
            <Download className="w-5 h-5" />
            <span>Exporter</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Numéro
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Client
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Montant HT
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Marge
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Statut
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredVentes.map((vente) => (
                <tr key={vente.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {vente.numero}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(vente.date_vente).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900">
                    {vente.client_nom}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {vente.prix_vente_ht.toLocaleString()} €
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {vente.marge !== null && (
                        <>
                          <span className="text-sm font-medium text-slate-900">
                            {vente.marge.toLocaleString()} €
                          </span>
                          {vente.taux_marge !== null && (
                            <span className={`text-xs font-medium ${
                              vente.taux_marge >= 20 ? 'text-emerald-600' :
                              vente.taux_marge >= 10 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              ({vente.taux_marge.toFixed(1)}%)
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(vente.statut)}`}>
                      {vente.statut}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredVentes.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Aucune vente trouvée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
