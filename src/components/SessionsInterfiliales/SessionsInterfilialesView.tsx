import { useEffect, useMemo, useState } from 'react';
import { Plus, X, ArrowLeftRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useFilialeContext } from '../../contexts/FilialeContext';
import type { Database } from '../../lib/database.types';
import { ModalTabs } from '../ui/ModalTabs';

type Session = Database['public']['Tables']['sessions_interfiliales']['Row'];
type Filiale = { id: string; nom: string | null; code: string | null };
type Article = { id: string; reference: string | null; libelle: string | null; marque: string | null; modele: string | null };
type StockItem = {
  id: string;
  numero_serie: string | null;
  marque: string | null;
  modele: string | null;
  filiale_id: string;
};

export function SessionsInterfilialesView() {
  const { profile } = useAuth();
  const { filialeId, isAdmin } = useFilialeContext();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'transfert' | 'quantites' | 'notes'>('transfert');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    numero: `TR-${Date.now()}`,
    filiale_destination_id: '',
    article_id: '',
    stock_item_id: '',
    numero_serie: '',
    quantite: 1,
    prix_transfert: '',
    commentaires: '',
  });

  useEffect(() => {
    const load = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }
      const baseQuery = supabase
        .from('sessions_interfiliales')
        .select('*')
        .order('date_demande', { ascending: false });

      if (!isAdmin && !filialeId) {
        setSessions([]);
        setLoading(false);
        return;
      }

      let query = baseQuery;
      if (filialeId) {
        query = query.or(`filiale_origine_id.eq.${filialeId},filiale_destination_id.eq.${filialeId}`);
      }
      const { data, error } = await query.limit(50);
      if (!error && data) setSessions(data as Session[]);

      const { data: filialesData } = await supabase.from('filiales').select('id, nom, code').order('nom');
      if (filialesData) setFiliales(filialesData as Filiale[]);

      const { data: articlesData } = await supabase
        .from('articles')
        .select('*')
        .limit(100);
      if (articlesData) setArticles(articlesData as Article[]);

      let stockQuery = supabase
        .from('stock_items')
        .select('id, numero_serie, marque, modele, filiale_id')
        .order('date_entree', { ascending: false })
        .limit(200);
      if (filialeId) {
        stockQuery = stockQuery.eq('filiale_id', filialeId);
      }
      const { data: stockData } = await stockQuery;
      if (stockData) setStockItems(stockData as StockItem[]);

      setLoading(false);
    };
    load();
  }, [filialeId, isAdmin, profile]);

  const submit = async () => {
    if (!profile) return;
    const filialeOrigine = filialeId;
    if (!filialeOrigine) {
      setSubmitError('Aucune filiale origine trouvee. Associez une filiale au profil.');
      return;
    }
    if (!formData.numero || !formData.filiale_destination_id || !formData.article_id) {
      setSubmitError('Numero, filiale destination et article sont requis.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);
    const payload = {
      numero: formData.numero,
      filiale_origine_id: filialeOrigine,
      filiale_destination_id: formData.filiale_destination_id,
      article_id: formData.article_id,
      stock_item_id: formData.stock_item_id || null,
      numero_serie: formData.numero_serie || null,
      quantite: Number(formData.quantite) || 1,
      prix_transfert: formData.prix_transfert ? Number(formData.prix_transfert) : null,
      statut: 'En_attente' as Session['statut'],
      demande_par_id: profile.id,
      commentaires: formData.commentaires || null,
    };
    const { error } = await supabase.from('sessions_interfiliales').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    setSubmitLoading(false);
    setIsModalOpen(false);
    setFormData({
      numero: `TR-${Date.now()}`,
      filiale_destination_id: '',
      article_id: '',
      stock_item_id: '',
      numero_serie: '',
      quantite: 1,
      prix_transfert: '',
      commentaires: '',
    });
    let reloadQuery = supabase
      .from('sessions_interfiliales')
      .select('*')
      .order('date_demande', { ascending: false });
    if (filialeId) {
      reloadQuery = reloadQuery.or(`filiale_origine_id.eq.${filialeId},filiale_destination_id.eq.${filialeId}`);
    }
    const { data } = await reloadQuery.limit(50);
    if (data) setSessions(data as Session[]);
  };

  const filialeMap = useMemo(
    () => new Map(filiales.map((filiale) => [filiale.id, filiale.nom || filiale.code || 'Filiale'])),
    [filiales]
  );
  const articleMap = useMemo(() => {
    const entries = articles.map((article) => {
      const base = [article.reference, article.libelle].filter(Boolean).join(' - ');
      const details = [article.marque, article.modele].filter(Boolean).join(' ');
      let label = base || details || 'Article';
      if (base && details) {
        label = `${base} (${details})`;
      }
      return [article.id, label] as const;
    });
    return new Map(entries);
  }, [articles]);
  const getStockItemLabel = (item: StockItem) => {
    const base = [item.marque, item.modele].filter(Boolean).join(' ');
    const label = base || 'Stock item';
    const serial = item.numero_serie ? `S/N ${item.numero_serie}` : '';
    return [label, serial].filter(Boolean).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Sessions Interfiliales</h1>
          <p className="text-slate-600">Transferts de machines entre filiales</p>
        </div>
        <button
          onClick={() => {
            setSubmitError('');
            setIsModalOpen(true);
            setModalTab('transfert');
          }}
          className="flex items-center space-x-2 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white px-5 py-2.5 rounded-lg shadow hover:from-fuchsia-600 hover:to-purple-700"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle session</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Numéro</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Origine</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Destination</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Article</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Quantité</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-sm font-semibold text-slate-900">{s.numero}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {filialeMap.get(s.filiale_origine_id) || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {filialeMap.get(s.filiale_destination_id) || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900">{articleMap.get(s.article_id) || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-900">{s.quantite}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      {s.statut}
                    </span>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                    Aucun transfert enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <ArrowLeftRight className="w-5 h-5 text-fuchsia-600" />
              <h2 className="text-xl font-semibold text-slate-900">Nouvelle session interfiliales</h2>
            </div>
            <ModalTabs
              tabs={[
                { id: 'transfert', label: 'Transfert' },
                { id: 'quantites', label: 'Quantites' },
                { id: 'notes', label: 'Notes' },
              ]}
              activeTab={modalTab}
              onChange={(key) => setModalTab(key as typeof modalTab)}
            />
            {modalTab === 'transfert' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Numero</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Filiale destination</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.filiale_destination_id}
                    onChange={(e) => setFormData({ ...formData, filiale_destination_id: e.target.value })}
                  >
                    <option value="">Choisir une filiale</option>
                    {filiales.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nom || f.code || 'Filiale'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Article</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.article_id}
                    onChange={(e) => setFormData({ ...formData, article_id: e.target.value })}
                  >
                    <option value="">Choisir un article</option>
                    {articles.map((a) => (
                      <option key={a.id} value={a.id}>
                        {articleMap.get(a.id) || 'Article'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Stock item (optionnel)</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.stock_item_id}
                    onChange={(e) => setFormData({ ...formData, stock_item_id: e.target.value })}
                  >
                    <option value="">Aucun</option>
                    {stockItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getStockItemLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Numero de serie</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                  />
                </div>
              </div>
            )}
            {modalTab === 'quantites' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Quantite</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.quantite}
                    onChange={(e) => setFormData({ ...formData, quantite: Number(e.target.value) })}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Prix de transfert (optionnel)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.prix_transfert}
                    onChange={(e) => setFormData({ ...formData, prix_transfert: e.target.value })}
                  />
                </div>
              </div>
            )}
            {modalTab === 'notes' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Commentaires</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.commentaires}
                    onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            )}

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
                onClick={submit}
                disabled={submitLoading || !formData.article_id || !formData.filiale_destination_id}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold shadow hover:from-fuchsia-600 hover:to-purple-700 disabled:opacity-60"
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





