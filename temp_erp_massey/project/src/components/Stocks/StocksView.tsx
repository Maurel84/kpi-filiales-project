import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Search, AlertTriangle, Package, Download } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type StockItem = Database['public']['Tables']['stock_items']['Row'] & {
  articles?: Database['public']['Tables']['articles']['Row'];
};

export function StocksView() {
  const { profile } = useAuth();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadStocks();
  }, [profile, statusFilter]);

  const loadStocks = async () => {
    if (!profile) return;

    let query = supabase
      .from('stock_items')
      .select('*, articles(*)')
      .order('date_entree', { ascending: false });

    if (profile.role !== 'admin_siege' && profile.filiale_id) {
      query = query.eq('filiale_id', profile.filiale_id);
    }

    if (statusFilter !== 'all') {
      query = query.eq('statut', statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setStocks(data as StockItem[]);
    }

    setLoading(false);
  };

  const calculateMonthsInStock = (dateEntree: string) => {
    const months = Math.floor(
      (Date.now() - new Date(dateEntree).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    return months;
  };

  const filteredStocks = stocks.filter(stock => {
    if (!stock.articles) return false;
    return (
      stock.articles.libelle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.articles.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.numero_serie?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      Disponible: 'bg-emerald-100 text-emerald-800',
      Reserve: 'bg-blue-100 text-blue-800',
      Vendu: 'bg-slate-100 text-slate-800',
      Transfert: 'bg-amber-100 text-amber-800',
      Obsolete: 'bg-red-100 text-red-800',
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestion des Stocks</h1>
          <p className="text-slate-600">
            Suivi des articles et gestion des emplacements
          </p>
        </div>
        <button className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition shadow-lg hover:shadow-xl">
          <Plus className="w-5 h-5" />
          <span className="font-medium">Ajouter au stock</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total articles</p>
              <p className="text-2xl font-bold text-slate-900">{stocks.length}</p>
            </div>
            <Package className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Disponibles</p>
              <p className="text-2xl font-bold text-emerald-600">
                {stocks.filter(s => s.statut === 'Disponible').length}
              </p>
            </div>
            <Package className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Réservés</p>
              <p className="text-2xl font-bold text-blue-600">
                {stocks.filter(s => s.statut === 'Reserve').length}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Obsolètes (+12 mois)</p>
              <p className="text-2xl font-bold text-red-600">
                {stocks.filter(s => calculateMonthsInStock(s.date_entree) > 12).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par référence, libellé ou numéro de série..."
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
            <option value="Disponible">Disponible</option>
            <option value="Reserve">Réservé</option>
            <option value="Vendu">Vendu</option>
            <option value="Transfert">Transfert</option>
            <option value="Obsolete">Obsolète</option>
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
                  Référence
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Article
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  N° Série
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Quantité
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Date entrée
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Âge (mois)
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
              {filteredStocks.map((stock) => {
                const monthsInStock = calculateMonthsInStock(stock.date_entree);
                const isObsolete = monthsInStock > 12;

                return (
                  <tr key={stock.id} className={`hover:bg-slate-50 transition ${isObsolete ? 'bg-red-50/50' : ''}`}>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                      {stock.articles?.reference}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900">
                      <div>
                        <p className="font-medium">{stock.articles?.libelle}</p>
                        {stock.articles?.marque && (
                          <p className="text-xs text-slate-500">
                            {stock.articles.marque} {stock.articles.modele}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {stock.numero_serie || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                      {stock.quantite}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(stock.date_entree).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm font-medium ${
                        isObsolete ? 'text-red-600' :
                        monthsInStock > 6 ? 'text-amber-600' :
                        'text-slate-900'
                      }`}>
                        {monthsInStock}
                        {isObsolete && (
                          <AlertTriangle className="w-4 h-4 inline ml-1" />
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(stock.statut)}`}>
                        {stock.statut}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                        Modifier
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredStocks.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Aucun article en stock</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
