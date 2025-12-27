import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, AlertTriangle, Package, Download, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type StockItem = Database['public']['Tables']['stock_items']['Row'];

type StockStatus = Database['public']['Tables']['stock_items']['Row']['statut'];

type StockForm = Omit<Database['public']['Tables']['stock_items']['Insert'], 'filiale_id' | 'created_by'> & {
  filiale_id: string | null;
  created_by: string | null;
};

const defaultForm: StockForm = {
  marque: '',
  modele: '',
  numero_serie: '',
  pays: '',
  gamme: '',
  date_entree: new Date().toISOString().slice(0, 10),
  prix_revient: null,
  statut: 'Disponible',
  filiale_id: null,
  created_by: null,
};

export function StocksView() {
  const { profile } = useAuth();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState<StockForm>(defaultForm);

  const loadStocks = useCallback(async () => {
    if (!profile) return;

    let query = supabase
      .from('stock_items')
      .select('id, filiale_id, statut, marque, modele, numero_serie, gamme, pays, date_entree, prix_revient')
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
  }, [profile, statusFilter]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      ...prev,
      filiale_id: profile.filiale_id || null,
      created_by: profile.id,
    }));
  }, [profile]);

  const submitStock = async () => {
    if (!profile) return;
    if (!formData.marque || !formData.modele) {
      setSubmitError('Marque et modele requis.');
      return;
    }
    if (!profile.filiale_id) {
      setSubmitError('Filiale requise pour enregistrer un stock.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);

    const payload = {
      marque: formData.marque,
      modele: formData.modele,
      numero_serie: formData.numero_serie || null,
      pays: formData.pays || null,
      gamme: formData.gamme || null,
      date_entree: formData.date_entree || new Date().toISOString().slice(0, 10),
      prix_revient: formData.prix_revient ? Number(formData.prix_revient) : null,
      statut: formData.statut,
      filiale_id: profile.filiale_id,
      created_by: profile.id,
    };

    const { error } = await supabase.from('stock_items').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    setSubmitLoading(false);
    setIsModalOpen(false);
    setFormData({
      ...defaultForm,
      date_entree: new Date().toISOString().slice(0, 10),
      filiale_id: profile.filiale_id,
      created_by: profile.id,
    });
    loadStocks();
  };

  const calculateMonthsInStock = (dateEntree: string) => {
    const months = Math.floor(
      (Date.now() - new Date(dateEntree).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    return months;
  };

  const filteredStocks = stocks.filter((stock) => {
    const term = searchTerm.toLowerCase();
    return (
      (stock.marque || '').toLowerCase().includes(term) ||
      (stock.modele || '').toLowerCase().includes(term) ||
      (stock.numero_serie || '').toLowerCase().includes(term) ||
      (stock.gamme || '').toLowerCase().includes(term) ||
      (stock.pays || '').toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      Disponible: 'bg-green-100 text-green-800',
      Reserve: 'bg-blue-100 text-blue-800',
      Vendu: 'bg-slate-100 text-slate-800',
      Transfert: 'bg-amber-100 text-amber-800',
      Obsolete: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestion des Stocks</h1>
            <p className="text-slate-600">ETAT STOCK : Statut, Marque, Modele, S/N, Gamme, Pays, Date entree, Prix de revient HT</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-6 py-3 rounded-lg hover:from-amber-600 hover:to-yellow-700 transition shadow-lg hover:shadow-xl"
          >
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
              <Package className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Disponibles</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stocks.filter((s) => s.statut === 'Disponible').length}
                </p>
              </div>
              <Package className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Reserves</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stocks.filter((s) => s.statut === 'Reserve').length}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Obsoletes (+12 mois)</p>
                <p className="text-2xl font-bold text-red-600">
                  {stocks.filter((s) => calculateMonthsInStock(s.date_entree) > 12).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par marque, modele ou S/N..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StockStatus | 'all')}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="Disponible">Disponible</option>
              <option value="Reserve">Reserve</option>
              <option value="Vendu">Vendu</option>
              <option value="Transfert">Transfert</option>
              <option value="Obsolete">Obsolete</option>
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Marque</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Modele</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">S/N</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Gamme</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Pays</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date d'entree</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Prix de revient HT</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Age (mois)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStocks.map((stock) => {
                  const monthsInStock = calculateMonthsInStock(stock.date_entree);
                  const isObsolete = monthsInStock > 12;

                  return (
                    <tr key={stock.id} className={`hover:bg-slate-50 transition ${isObsolete ? 'bg-red-50/50' : ''}`}>
                      <td className="py-3 px-4 text-sm text-slate-900">{stock.marque || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">{stock.modele || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">{stock.numero_serie || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">{stock.gamme || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">{stock.pays || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(stock.statut)}`}>
                          {stock.statut}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(stock.date_entree).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900">
                        {stock.prix_revient?.toLocaleString() || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium ${isObsolete ? 'text-red-600' : monthsInStock > 6 ? 'text-amber-600' : 'text-slate-900'}`}>
                          {monthsInStock}
                          {isObsolete && <AlertTriangle className="w-4 h-4 inline ml-1" />}
                        </span>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:text-slate-800">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Ajouter au stock</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Marque</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.marque || ''}
                  onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Modele</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.modele || ''}
                  onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">S/N</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.numero_serie || ''}
                  onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Gamme</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.gamme || ''}
                  onChange={(e) => setFormData({ ...formData, gamme: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Pays</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.pays || ''}
                  onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date d'entree</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.date_entree || ''}
                  onChange={(e) => setFormData({ ...formData, date_entree: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Statut</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.statut}
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value as StockStatus })}
                >
                  <option value="Disponible">Disponible</option>
                  <option value="Reserve">Reserve</option>
                  <option value="Vendu">Vendu</option>
                  <option value="Transfert">Transfert</option>
                  <option value="Obsolete">Obsolete</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Prix de revient HT</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.prix_revient ?? ''}
                  onChange={(e) => setFormData({ ...formData, prix_revient: Number(e.target.value) || null })}
                />
              </div>
            </div>

            {submitError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                disabled={submitLoading}
              >
                Annuler
              </button>
              <button
                onClick={submitStock}
                disabled={submitLoading || !formData.marque || !formData.modele}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold shadow hover:from-amber-600 hover:to-yellow-700 disabled:opacity-60"
              >
                {submitLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
