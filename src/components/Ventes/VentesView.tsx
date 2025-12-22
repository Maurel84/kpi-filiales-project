import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Search, TrendingUp, Download, X } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type VenteRow = Database['public']['Tables']['ventes']['Row'] & {
  articles?: Database['public']['Tables']['articles']['Row'] | null;
};
type Article = Pick<Database['public']['Tables']['articles']['Row'], 'id' | 'reference' | 'libelle' | 'marque' | 'modele'>;
type Filiale = { id: string; nom: string | null; code: string | null };
type UserProfile = Database['public']['Tables']['users_profiles']['Row'];

type VenteInsert = Database['public']['Tables']['ventes']['Insert'];
type VenteStatut = Database['public']['Tables']['ventes']['Row']['statut'];
type VenteStatutFilter = VenteStatut | 'all';
type VenteForm = Omit<VenteInsert, 'filiale_id' | 'created_by' | 'commercial_id'> & {
  filiale_id: string | null;
  created_by: string | null;
  commercial_id: string | null;
};

const extractCommentValue = (commentaires: string | null, label: string) => {
  if (!commentaires) return null;
  const parts = commentaires.split('|').map((part) => part.trim());
  const match = parts.find((part) => part.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  if (!match) return null;
  const value = match.split(':').slice(1).join(':').trim();
  return value || null;
};

export function VentesView() {
  const { profile } = useAuth();
  const [ventes, setVentes] = useState<VenteRow[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [vendeurs, setVendeurs] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<VenteStatutFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isCessionInterne, setIsCessionInterne] = useState(false);
  const [destinationFilialeId, setDestinationFilialeId] = useState('');
  const [formData, setFormData] = useState<VenteForm>({
    numero: '',
    date_vente: new Date().toISOString().slice(0, 10),
    client_nom: '',
    client_pays: '',
    gamme: '',
    src: '',
    prix_vente_ht: 0,
    quantite: 1,
    statut: 'Facturee',
    article_id: '',
    filiale_id: null,
    commentaires: '',
    created_by: null,
    numero_serie: '',
    commercial_id: '',
  });

  const loadVentes = useCallback(async () => {
    if (!profile) return;

    let query = supabase
      .from('ventes')
      .select('*, articles(marque, modele, libelle)')
      .order('date_vente', { ascending: false });

    if (profile.role !== 'admin_siege' && profile.filiale_id) {
      query = query.eq('filiale_id', profile.filiale_id);
    }

    if (statusFilter !== 'all') {
      query = query.eq('statut', statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setVentes(data as unknown as VenteRow[]);
    }

    setLoading(false);
  }, [profile, statusFilter]);

  useEffect(() => {
    loadVentes();
  }, [loadVentes]);

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

  useEffect(() => {
    const loadFiliales = async () => {
      const { data } = await supabase.from('filiales').select('id, nom, code').order('nom');
      if (data) setFiliales(data as Filiale[]);
    };
    loadFiliales();
  }, []);

  useEffect(() => {
    const loadVendeurs = async () => {
      if (!profile) return;
      let query = supabase.from('users_profiles').select('*').eq('actif', true).order('nom');
      if (profile.role !== 'admin_siege') {
        if (!profile.filiale_id) {
          setVendeurs([]);
          return;
        }
        query = query.eq('filiale_id', profile.filiale_id);
      }
      const { data } = await query;
      if (data) setVendeurs(data as UserProfile[]);
    };
    loadVendeurs();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      ...prev,
      filiale_id: profile.filiale_id || null,
      created_by: profile.id,
      commercial_id: profile.id,
    }));
  }, [profile]);

  const vendeurMap = useMemo(() => new Map(vendeurs.map((vendeur) => [vendeur.id, vendeur])), [vendeurs]);
  const roleLabels: Record<UserProfile['role'], string> = {
    admin_siege: 'Admin siege',
    manager_filiale: 'Manager filiale',
    commercial: 'Commercial',
    technicien: 'Technicien',
    saisie: 'Saisie',
  };
  const getVendeurInfo = (id: string | null) => {
    if (!id) return { label: '-', meta: '' };
    const vendeur = vendeurMap.get(id);
    if (!vendeur) return { label: 'Utilisateur', meta: '' };
    const label =
      [vendeur.prenom, vendeur.nom].filter(Boolean).join(' ').trim() || vendeur.email || 'Utilisateur';
    const meta = [vendeur.poste, roleLabels[vendeur.role]].filter(Boolean).join(' - ');
    return { label, meta };
  };

  const getArticleLabel = (article: Article) => {
    const base = [article.reference, article.libelle].filter(Boolean).join(' - ');
    const details = [article.marque, article.modele].filter(Boolean).join(' ');
    if (base && details) return `${base} (${details})`;
    return base || details || 'Article';
  };

  const submitVente = async () => {
    if (!profile) return;
    const isCession = isCessionInterne;
    if (!formData.numero || (!formData.client_nom && !isCession) || !formData.article_id) {
      setSubmitError('Numéro, client et article sont requis.');
      return;
    }
    if (!profile.filiale_id) {
      setSubmitError('Filiale requise pour enregistrer une vente.');
      return;
    }
    if (isCession && !destinationFilialeId) {
      setSubmitError('Filiale destination requise pour une cession interne.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);

    const destinationLabel =
      filiales.find((filiale) => filiale.id === destinationFilialeId)?.nom ||
      filiales.find((filiale) => filiale.id === destinationFilialeId)?.code ||
      destinationFilialeId;

    const commentairesParts = [
      isCession ? `[CESSION_INTERNE] Destination: ${destinationLabel || 'Non précisée'}` : null,
      (formData.commentaires || '').trim() || null,
    ].filter(Boolean);

    const payload: VenteInsert = {
      ...formData,
      client_nom: isCession ? 'Cession interne' : formData.client_nom,
      client_pays: formData.client_pays || null,
      gamme: formData.gamme || null,
      src: formData.src || null,
      prix_vente_ht: isCession ? 0 : Number(formData.prix_vente_ht) || 0,
      quantite: Number(formData.quantite) || 1,
      filiale_id: profile.filiale_id,
      commentaires: commentairesParts.length > 0 ? commentairesParts.join(' | ') : null,
      statut: isCession ? 'Facturee' : formData.statut,
      created_by: profile.id,
      commercial_id: formData.commercial_id || profile.id,
      numero_serie: formData.numero_serie || null,
    };

    const { error } = await supabase.from('ventes').insert(payload as any);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    setSubmitLoading(false);
    setIsModalOpen(false);
    setFormData({
      numero: '',
      date_vente: new Date().toISOString().slice(0, 10),
      client_nom: '',
      client_pays: '',
      gamme: '',
      src: '',
      prix_vente_ht: 0,
      quantite: 1,
      statut: 'Facturee',
      article_id: '',
      filiale_id: profile.filiale_id,
      commentaires: '',
      created_by: profile.id,
      numero_serie: '',
      commercial_id: profile.id,
    });
    setIsCessionInterne(false);
    setDestinationFilialeId('');
    loadVentes();
  };

  const filteredVentes = ventes.filter((vente) => {
    const term = searchTerm.toLowerCase();
    return (
      vente.client_nom.toLowerCase().includes(term) ||
      vente.numero.toLowerCase().includes(term) ||
      (vente.articles?.libelle || '').toLowerCase().includes(term) ||
      (vente.articles?.modele || '').toLowerCase().includes(term) ||
      (vente.numero_serie || '').toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Ventes</h1>
          <p className="text-slate-600">
            ETAT DES VENTES : Date, Client, Marque/Modèle, S/N, Gamme, Pays, Vendeur, CA HT, SRC
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-6 py-3 rounded-lg hover:from-amber-600 hover:to-yellow-700 transition shadow-lg hover:shadow-xl"
        >
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
              placeholder="Rechercher par client ou numero..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as VenteStatutFilter)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Marque / Modèle</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">S/N</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Gamme</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Pays</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Vendeur</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">CA HT</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">SRC</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredVentes.map((vente) => {
                const isCession = (vente.commentaires || '').includes('[CESSION_INTERNE]');
                const gammeVal = vente.gamme || extractCommentValue(vente.commentaires, 'Gamme') || '-';
                const paysVal = vente.client_pays || extractCommentValue(vente.commentaires, 'Pays') || '-';
                const srcVal = vente.src || extractCommentValue(vente.commentaires, 'SRC') || '-';
                const vendeurInfo = getVendeurInfo(vente.commercial_id);
                return (
                  <tr key={vente.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(vente.date_vente).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900">
                      {vente.client_nom}
                      {isCession && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Cession interne
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900">
                      <div className="font-medium">{vente.articles?.marque || '-'}</div>
                      <div className="text-xs text-slate-600">{vente.articles?.modele || vente.articles?.libelle || '-'}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">{vente.numero_serie || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{gammeVal}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{paysVal}</td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-900">{vendeurInfo.label}</div>
                      {vendeurInfo.meta && (
                        <div className="text-xs text-slate-500">{vendeurInfo.meta}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                      {vente.prix_vente_ht.toLocaleString()} XAF
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">{srcVal}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {vente.statut}
                      </span>
                    </td>
                  </tr>
                );
              })}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Nouvelle vente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Numéro</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.date_vente}
                  onChange={(e) => setFormData({ ...formData, date_vente: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Client</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.client_nom}
                  onChange={(e) => setFormData({ ...formData, client_nom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Article</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.article_id}
                  onChange={(e) => setFormData({ ...formData, article_id: e.target.value })}
                >
                  <option value="">Sélectionner un article</option>
                  {articles.map((article) => (
                    <option key={article.id} value={article.id}>
                      {getArticleLabel(article)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Numéro de série</label>
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
                  value={formData.client_pays || ''}
                  onChange={(e) => setFormData({ ...formData, client_pays: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Vendeur</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.commercial_id || ''}
                  onChange={(e) => setFormData({ ...formData, commercial_id: e.target.value })}
                >
                  <option value="">Sélectionner</option>
                  {vendeurs.map((vendeur) => {
                    const label =
                      [vendeur.prenom, vendeur.nom].filter(Boolean).join(' ').trim() ||
                      vendeur.email ||
                      'Utilisateur';
                    const extra = vendeur.poste ? ` - ${vendeur.poste}` : '';
                    return (
                      <option key={vendeur.id} value={vendeur.id}>
                        {label}{extra}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Montant HT</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.prix_vente_ht}
                  onChange={(e) => setFormData({ ...formData, prix_vente_ht: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Quantité</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.quantite}
                  onChange={(e) => setFormData({ ...formData, quantite: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Statut</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.statut}
                  onChange={(e) =>
                    setFormData({ ...formData, statut: e.target.value as VenteInsert['statut'] })
                  }
                >
                  <option value="Devis">Devis</option>
                  <option value="Commande">Commande</option>
                  <option value="Facturee">Facturée</option>
                  <option value="Annulee">Annulée</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium text-slate-700">SRC</label>
              <input
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={formData.src || ''}
                onChange={(e) => setFormData({ ...formData, src: e.target.value })}
              />
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium text-slate-700">Commentaires</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                rows={3}
                value={formData.commentaires ?? ''}
                onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
              />
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-800">Cession interne (sans CA)</p>
                  <p className="text-xs text-amber-700">
                    N'impacte pas le chiffre d'affaires, enregistre la destination dans les commentaires.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCessionInterne((prev) => !prev);
                    setFormData((prev) => ({
                      ...prev,
                      prix_vente_ht: prev.prix_vente_ht === 0 ? prev.prix_vente_ht : 0,
                      statut: 'Facturee',
                      client_nom: prev.client_nom || 'Cession interne',
                    }));
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                    isCessionInterne
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {isCessionInterne ? 'Actif' : 'Inactif'}
                </button>
              </div>
              {isCessionInterne && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Filiale destination</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      value={destinationFilialeId}
                      onChange={(e) => setDestinationFilialeId(e.target.value)}
                    >
                      <option value="">Choisir la filiale</option>
                      {filiales.map((filiale) => (
                        <option key={filiale.id} value={filiale.id}>
                          {filiale.nom || filiale.code || 'Filiale'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Montant HT</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-500"
                      value={0}
                      disabled
                    />
                  </div>
                </div>
              )}
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
                onClick={submitVente}
                disabled={
                  submitLoading ||
                  !formData.numero ||
                  (!isCessionInterne && !formData.client_nom) ||
                  !formData.article_id
                }
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold shadow hover:from-amber-600 hover:to-yellow-700 disabled:opacity-60"
              >
                {submitLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
