import { useEffect, useState } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type LostSale = Database['public']['Tables']['ventes_perdues']['Row'];
type Article = Pick<Database['public']['Tables']['articles']['Row'], 'id' | 'reference' | 'libelle' | 'marque' | 'modele'>;

const defaultDate = () => new Date().toISOString().slice(0, 10);

export function VentesPerduesView() {
  const { profile } = useAuth();
  const [items, setItems] = useState<LostSale[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_potentiel: '',
    pays: '',
    article_id: '',
    montant_estime: 0,
    motif_perte: 'Prix',
    concurrent: '',
    date_opportunite: defaultDate(),
    commentaires: '',
  });

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      const isAdmin = profile.role === 'admin_siege';
      const filialeId = profile.filiale_id;
      const query = supabase
        .from('ventes_perdues')
        .select('*')
        .order('date_opportunite', { ascending: false });
      if (!isAdmin) {
        if (!filialeId) {
          setItems([]);
          setLoading(false);
          return;
        }
        const { data, error } = await query.eq('filiale_id', filialeId).limit(50);
        if (!error && data) setItems(data as LostSale[]);
        setLoading(false);
        return;
      }
      const { data, error } = await query.limit(50);
      if (!error && data) setItems(data as LostSale[]);
      setLoading(false);
    };
    load();
  }, [profile]);

  useEffect(() => {
    const loadArticles = async () => {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .order('reference')
        .limit(500);
      if (data) setArticles(data as Article[]);
    };
    loadArticles();
  }, []);

  const getArticleLabel = (article: Article) => {
    const base = [article.reference, article.libelle].filter(Boolean).join(' - ');
    const details = [article.marque, article.modele].filter(Boolean).join(' ');
    if (base && details) return `${base} (${details})`;
    return base || details || 'Article';
  };

  const submit = async () => {
    if (!profile) return;
    if (!profile.filiale_id) {
      setSubmitError('Aucune filiale associée au profil. Merci de renseigner la filiale.');
      return;
    }
    if (!formData.client_potentiel) {
      setSubmitError('Client potentiel requis');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);
    const payload = {
      client_potentiel: formData.client_potentiel,
      pays: formData.pays || null,
      article_id: formData.article_id || null,
      montant_estime: formData.montant_estime ? Number(formData.montant_estime) : null,
      motif_perte: formData.motif_perte as LostSale['motif_perte'],
      concurrent: formData.concurrent || null,
      commentaires: formData.commentaires || null,
      date_opportunite: formData.date_opportunite || defaultDate(),
      filiale_id: profile.filiale_id,
      created_by: profile.id,
    };
    const { error } = await supabase.from('ventes_perdues').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    setIsModalOpen(false);
    setSubmitLoading(false);
    setFormData({ ...formData, client_potentiel: '', article_id: '', concurrent: '', commentaires: '' });
    const query = supabase.from('ventes_perdues').select('*').order('date_opportunite', { ascending: false });
    const { data } = profile.role === 'admin_siege'
      ? await query.limit(50)
      : await query.eq('filiale_id', profile.filiale_id).limit(50);
    if (data) setItems(data as LostSale[]);
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Ventes Perdues</h1>
          <p className="text-slate-600">Analyse des opportunités non gagnées et concurrents</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white px-5 py-2.5 rounded-lg shadow hover:from-rose-600 hover:to-orange-600"
        >
          <Plus className="w-5 h-5" />
          <span>Déclarer une perte</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Motif</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Montant estimé</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Concurrent</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Commentaires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">{item.client_potentiel}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(item.date_opportunite).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      {item.motif_perte || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900">
                    {item.montant_estime ? `${item.montant_estime.toLocaleString()} XAF` : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">{item.concurrent || '—'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 max-w-xs">
                    {item.commentaires || '—'}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-slate-500 text-sm" colSpan={6}>
                    Aucune vente perdue enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Déclarer une vente perdue</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Client potentiel *</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.client_potentiel}
                  onChange={(e) => setFormData({ ...formData, client_potentiel: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Pays</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.pays}
                  onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Article (optionnel)</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.article_id}
                  onChange={(e) => setFormData({ ...formData, article_id: e.target.value })}
                >
                  <option value="">Aucun article</option>
                  {articles.map((article) => (
                    <option key={article.id} value={article.id}>
                      {getArticleLabel(article)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Montant estimé</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.montant_estime}
                  onChange={(e) => setFormData({ ...formData, montant_estime: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Motif de perte</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.motif_perte}
                  onChange={(e) => setFormData({ ...formData, motif_perte: e.target.value })}
                >
                  <option value="Prix">Prix</option>
                  <option value="Delai">Délai</option>
                  <option value="Concurrent">Concurrent</option>
                  <option value="Produit_inadequat">Produit inadéquat</option>
                  <option value="Budget_client">Budget client</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Concurrent</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.concurrent}
                  onChange={(e) => setFormData({ ...formData, concurrent: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date opportunité</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.date_opportunite}
                  onChange={(e) => setFormData({ ...formData, date_opportunite: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Commentaires</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.commentaires}
                  onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
                />
              </div>
            </div>

            {submitError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{submitError}</span>
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
                disabled={submitLoading || !formData.client_potentiel}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold shadow hover:from-rose-600 hover:to-orange-600 disabled:opacity-60"
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
