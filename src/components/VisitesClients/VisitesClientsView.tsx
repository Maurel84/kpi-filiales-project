import { useEffect, useMemo, useState } from 'react';
import { Calendar, Target, TrendingUp, Users, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
type Visite = {
  id: string;
  filiale_id: string;
  date_visite: string;
  nom_client: string;
  prenom_client?: string | null;
  fonction_client?: string | null;
  telephone_client?: string | null;
  whatsapp_client?: string | null;
  email_client?: string | null;
  url_societe_client?: string | null;
  notes?: string | null;
  visite_par_id?: string | null;
  created_at?: string;
};
type Opportunite = {
  id: string;
  filiale_id: string;
  visite_id?: string | null;
  nom_projet: string;
  ville?: string | null;
  marques?: string[] | null;
  modeles?: string[] | null;
  quantites?: number | null;
  montant_estime?: number | null;
  devise?: string | null;
  pourcentage_marge?: number | null;
  date_closing_prevue?: string | null;
  statut?: 'Gagnee' | 'En_cours' | 'Reportee' | 'Abandonnee' | 'Perdue' | string | null;
  taux_cloture_percent?: number | null;
  notes?: string | null;
  created_at?: string;
};
type LostSale = Database['public']['Tables']['ventes_perdues']['Row'];

const today = () => new Date().toISOString().slice(0, 10);

export function VisitesClientsView() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'visites' | 'opportunites' | 'pertes'>('visites');
  const [visites, setVisites] = useState<Visite[]>([]);
  const [opportunites, setOpportunites] = useState<Opportunite[]>([]);
  const [pertes, setPertes] = useState<LostSale[]>([]);
  const [articles, setArticles] = useState<Database['public']['Tables']['articles']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');

  const [isVisiteModal, setIsVisiteModal] = useState(false);
  const [isOppModal, setIsOppModal] = useState(false);
  const [isLossModal, setIsLossModal] = useState(false);

  const [visiteForm, setVisiteForm] = useState({
    date_visite: today(),
    nom_client: '',
    prenom_client: '',
    fonction_client: '',
    telephone_client: '',
    whatsapp_client: '',
    email_client: '',
    url_societe_client: '',
    notes: '',
  });

  const [oppForm, setOppForm] = useState({
    nom_projet: '',
    ville: '',
    marques: '',
    modeles: '',
    quantites: 1,
    montant_estime: '',
    devise: 'XAF',
    pourcentage_marge: '',
    date_closing_prevue: '',
    statut: 'En_cours',
    taux_cloture_percent: 0,
    notes: '',
    visite_id: '',
  });

  const [lossForm, setLossForm] = useState({
    client_potentiel: '',
    pays: '',
    montant_estime: '',
    motif_perte: 'Prix' as LostSale['motif_perte'],
    concurrent: '',
    commentaires: '',
    date_opportunite: today(),
    categorie_produit: '',
    article_id: '',
  });

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      const sb: any = supabase;
      const isAdmin = profile.role === 'admin_siege';
      const filialeId = profile.filiale_id;
      if (!isAdmin && !filialeId) {
        setVisites([]);
        setOpportunites([]);
        setPertes([]);
        setLoading(false);
        return;
      }

      const visitesQuery = sb
        .from('visites_clients')
        .select('*')
        .order('date_visite', { ascending: false })
        .limit(200);
      const oppQuery = sb
        .from('opportunites')
        .select('*')
        .order('date_closing_prevue', { ascending: false })
        .limit(200);
      if (!isAdmin && filialeId) {
        visitesQuery.eq('filiale_id', filialeId);
        oppQuery.eq('filiale_id', filialeId);
      }

      const [{ data: visitesData }, { data: oppData }] = await Promise.all([
        visitesQuery,
        oppQuery,
      ]);
      if (visitesData) setVisites(visitesData as Visite[]);
      if (oppData) setOpportunites(oppData as Opportunite[]);

      const lossQuery = supabase
        .from('ventes_perdues')
        .select('*')
        .order('date_opportunite', { ascending: false })
        .limit(200);
      let pertesData: LostSale[] | null = null;
      if (isAdmin) {
        const { data } = await lossQuery;
        pertesData = data as LostSale[] | null;
      } else {
        if (!filialeId) {
          setPertes([]);
          setLoading(false);
          return;
        }
        const { data } = await lossQuery.eq('filiale_id', filialeId);
        pertesData = data as LostSale[] | null;
      }
      if (pertesData) setPertes(pertesData);

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
      if (data) setArticles(data as Database['public']['Tables']['articles']['Row'][]);
    };
    loadArticles();
  }, []);

  const getArticleLabel = (article: Database['public']['Tables']['articles']['Row']) => {
    const base = [article.reference, article.libelle].filter(Boolean).join(' - ');
    const details = [article.marque, article.modele].filter(Boolean).join(' ');
    if (base && details) return `${base} (${details})`;
    return base || details || 'Article';
  };

  const stats = useMemo(() => {
    const oppEnCours = opportunites.filter((o) => o.statut === 'En_cours').length;
    const oppGagnees = opportunites.filter((o) => o.statut === 'Gagnee').length;
    const caPotentiel = opportunites.reduce((sum, o) => sum + (Number(o.montant_estime) || 0), 0);
    return { oppEnCours, oppGagnees, caPotentiel };
  }, [opportunites]);

  const resetErrors = () => setSubmitError('');

  const submitVisite = async () => {
    if (!profile) return;
    const filialeId = profile.filiale_id;
    if (!filialeId) {
      setSubmitError('Aucune filiale assignée au profil. Contactez un administrateur.');
      return;
    }
    if (!visiteForm.nom_client.trim()) {
      setSubmitError('Le nom du client est requis.');
      return;
    }
    resetErrors();
    setSubmitLoading(true);
    const payload = {
      filiale_id: filialeId,
      date_visite: visiteForm.date_visite || today(),
      nom_client: visiteForm.nom_client.trim(),
      prenom_client: visiteForm.prenom_client || null,
      fonction_client: visiteForm.fonction_client || null,
      telephone_client: visiteForm.telephone_client || null,
      whatsapp_client: visiteForm.whatsapp_client || null,
      email_client: visiteForm.email_client || null,
      url_societe_client: visiteForm.url_societe_client || null,
      notes: visiteForm.notes || null,
      visite_par_id: profile.id,
    };
    const { error } = await (supabase as any).from('visites_clients').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    const { data: visitesData } = await (supabase as any)
      .from('visites_clients')
      .select('*')
      .order('date_visite', { ascending: false })
      .limit(200);
    if (visitesData) setVisites(visitesData as Visite[]);
    setSubmitLoading(false);
    setIsVisiteModal(false);
    setVisiteForm({ ...visiteForm, nom_client: '', prenom_client: '', fonction_client: '', notes: '' });
  };

  const submitOpp = async () => {
    if (!profile) return;
    const filialeId = profile.filiale_id;
    if (!filialeId) {
      setSubmitError('Aucune filiale assignée au profil. Contactez un administrateur.');
      return;
    }
    if (!oppForm.nom_projet.trim()) {
      setSubmitError('Le nom du projet est requis.');
      return;
    }

    const marquesArr = oppForm.marques
      ? oppForm.marques.split(',').map((m) => m.trim()).filter(Boolean)
      : null;
    const modelesArr = oppForm.modeles
      ? oppForm.modeles.split(',').map((m) => m.trim()).filter(Boolean)
      : null;

    resetErrors();
    setSubmitLoading(true);
    const payload = {
      filiale_id: filialeId,
      visite_id: oppForm.visite_id || null,
      nom_projet: oppForm.nom_projet.trim(),
      ville: oppForm.ville || null,
      marques: marquesArr,
      modeles: modelesArr,
      quantites: oppForm.quantites ? Number(oppForm.quantites) : null,
      montant_estime: oppForm.montant_estime ? Number(oppForm.montant_estime) : null,
      devise: oppForm.devise || 'XAF',
      pourcentage_marge: oppForm.pourcentage_marge ? Number(oppForm.pourcentage_marge) : null,
      date_closing_prevue: oppForm.date_closing_prevue || null,
      statut: oppForm.statut,
      taux_cloture_percent: Number(oppForm.taux_cloture_percent) || 0,
      notes: oppForm.notes || null,
      created_by_id: profile.id,
    };
    const { error } = await (supabase as any).from('opportunites').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    const { data: oppData } = await (supabase as any)
      .from('opportunites')
      .select('*')
      .order('date_closing_prevue', { ascending: false })
      .limit(200);
    if (oppData) setOpportunites(oppData as Opportunite[]);
    setSubmitLoading(false);
    setIsOppModal(false);
    setOppForm({
      ...oppForm,
      nom_projet: '',
      ville: '',
      marques: '',
      modeles: '',
      quantites: 1,
      montant_estime: '',
      notes: '',
    });
  };

  const submitLoss = async () => {
    if (!profile) return;
    const filialeId = profile.filiale_id;
    if (!filialeId) {
      setSubmitError('Aucune filiale assignée au profil. Contactez un administrateur.');
      return;
    }
    if (!lossForm.client_potentiel.trim()) {
      setSubmitError('Le client potentiel est requis.');
      return;
    }
    resetErrors();
    setSubmitLoading(true);
    const payload = {
      filiale_id: filialeId,
      client_potentiel: lossForm.client_potentiel.trim(),
      pays: lossForm.pays || null,
      montant_estime: lossForm.montant_estime ? Number(lossForm.montant_estime) : null,
      motif_perte: lossForm.motif_perte,
      concurrent: lossForm.concurrent || null,
      commentaires: lossForm.commentaires || null,
      date_opportunite: lossForm.date_opportunite || today(),
      categorie_produit: lossForm.categorie_produit || null,
      article_id: lossForm.article_id || null,
      created_by: profile.id,
    };
    const { error } = await supabase.from('ventes_perdues').insert(payload as any);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    const { data: pertesData } = await supabase
      .from('ventes_perdues')
      .select('*')
      .order('date_opportunite', { ascending: false })
      .limit(200);
    if (pertesData) setPertes(pertesData as LostSale[]);
    setSubmitLoading(false);
    setIsLossModal(false);
    setLossForm({
      client_potentiel: '',
      pays: '',
      montant_estime: '',
      motif_perte: 'Prix',
      concurrent: '',
      commentaires: '',
      date_opportunite: today(),
      categorie_produit: '',
      article_id: '',
    });
  };

  const renderTabs = () => (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
      {[
        { key: 'visites', label: 'Visites' },
        { key: 'opportunites', label: 'Opportunités' },
        { key: 'pertes', label: 'Ventes perdues' },
      ].map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key as typeof activeTab)}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === tab.key
              ? 'bg-white text-slate-900 shadow'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Visites & Opportunités</h1>
          <p className="text-slate-600">
            Saisie des visites clients, opportunités associées et ventes perdues (conforme au PDF).
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsVisiteModal(true)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow hover:from-emerald-600 hover:to-teal-700"
          >
            + Nouvelle visite
          </button>
          <button
            onClick={() => setIsOppModal(true)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow hover:from-blue-600 hover:to-indigo-700"
          >
            + Opportunité
          </button>
          <button
            onClick={() => setIsLossModal(true)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow hover:from-rose-600 hover:to-orange-600"
          >
            + Vente perdue
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-100 text-emerald-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Visites</p>
            <p className="text-2xl font-bold text-slate-900">{visites.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-100 text-blue-700">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Opp. en cours</p>
            <p className="text-2xl font-bold text-slate-900">{stats.oppEnCours}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-amber-100 text-amber-700">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Opp. gagnées</p>
            <p className="text-2xl font-bold text-slate-900">{stats.oppGagnees}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-teal-100 text-teal-700">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">CA potentiel</p>
            <p className="text-2xl font-bold text-slate-900">
              {stats.caPotentiel.toLocaleString('fr-FR')} {oppForm.devise || 'XAF'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          {renderTabs()}
          {activeTab === 'opportunites' && (
            <select
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="En_cours">En cours</option>
              <option value="Gagnee">Gagnée</option>
              <option value="Reportee">Reportée</option>
              <option value="Abandonnee">Abandonnée</option>
              <option value="Perdue">Perdue</option>
            </select>
          )}
        </div>

        {activeTab === 'visites' && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Contact</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Téléphone</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visites.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(v.date_visite).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-slate-900">{v.nom_client}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {[v.prenom_client, v.fonction_client].filter(Boolean).join(' / ') || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {v.telephone_client || v.whatsapp_client || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 max-w-sm">{v.notes || 'N/A'}</td>
                  </tr>
                ))}
                {visites.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-sm text-slate-500" colSpan={5}>
                      Aucune visite saisie.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'opportunites' && (
          <div className="space-y-3">
            {opportunites
              .filter((o) => selectedStatut === 'all' || o.statut === selectedStatut)
              .map((o) => (
                <div
                  key={o.id}
                  className="border border-slate-200 rounded-xl p-4 hover:border-emerald-200 hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{o.ville || 'Ville N/A'}</p>
                      <h3 className="text-lg font-semibold text-slate-900">{o.nom_projet}</h3>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {o.statut || 'En_cours'}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-700">
                    <div>
                      <p className="text-slate-500 text-xs">Marques / Modèles</p>
                      <p className="font-medium">
                        {(o.marques && o.marques.join(', ')) || 'N/A'} / {(o.modeles && o.modeles.join(', ')) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Quantités</p>
                      <p className="font-medium">{o.quantites ?? 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">CA potentiel</p>
                      <p className="font-medium">
                        {o.montant_estime
                          ? `${Number(o.montant_estime).toLocaleString('fr-FR')} ${o.devise || 'XAF'}`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {o.notes && <p className="mt-2 text-sm text-slate-600">{o.notes}</p>}
                </div>
              ))}
            {opportunites.filter((o) => selectedStatut === 'all' || o.statut === selectedStatut).length === 0 && (
              <div className="text-sm text-slate-500 text-center py-6">Aucune opportunité pour ce statut.</div>
            )}
          </div>
        )}

        {activeTab === 'pertes' && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client potentiel</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Motif</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Concurrent</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pertes.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-sm font-semibold text-slate-900">{p.client_potentiel}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(p.date_opportunite).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">{p.motif_perte || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{p.concurrent || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-slate-900">
                      {p.montant_estime ? `${Number(p.montant_estime).toLocaleString('fr-FR')} XAF` : 'N/A'}
                    </td>
                  </tr>
                ))}
                {pertes.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-sm text-slate-500" colSpan={5}>
                      Aucune vente perdue saisie.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isVisiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsVisiteModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Nouvelle visite client</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!profile?.filiale_id && (
                <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Aucune filiale assignée au profil. Contactez un administrateur pour pouvoir saisir.
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date de visite</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={visiteForm.date_visite}
                  onChange={(e) => setVisiteForm({ ...visiteForm, date_visite: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nom client *</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={visiteForm.nom_client}
                  onChange={(e) => setVisiteForm({ ...visiteForm, nom_client: e.target.value })}
                  placeholder="Societe / Client visite"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Prenom / Nom du contact</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={visiteForm.prenom_client}
                  onChange={(e) => setVisiteForm({ ...visiteForm, prenom_client: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Fonction du contact</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={visiteForm.fonction_client}
                  onChange={(e) => setVisiteForm({ ...visiteForm, fonction_client: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Téléphone</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={visiteForm.telephone_client}
                  onChange={(e) => setVisiteForm({ ...visiteForm, telephone_client: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">WhatsApp</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={visiteForm.whatsapp_client}
                  onChange={(e) => setVisiteForm({ ...visiteForm, whatsapp_client: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={visiteForm.email_client}
                  onChange={(e) => setVisiteForm({ ...visiteForm, email_client: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Site / LinkedIn</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={visiteForm.url_societe_client}
                  onChange={(e) => setVisiteForm({ ...visiteForm, url_societe_client: e.target.value })}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={visiteForm.notes}
                  onChange={(e) => setVisiteForm({ ...visiteForm, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {submitError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsVisiteModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                disabled={submitLoading}
              >
                Annuler
              </button>
              <button
                onClick={submitVisite}
                disabled={submitLoading || !profile?.filiale_id}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
              >
                {submitLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isOppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsOppModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Nouvelle opportunité</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!profile?.filiale_id && (
                <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Aucune filiale assignée au profil. Contactez un administrateur pour pouvoir saisir.
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Projet / Opportunité *</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={oppForm.nom_projet}
                  onChange={(e) => setOppForm({ ...oppForm, nom_projet: e.target.value })}
                  placeholder="Intitulé du projet"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Ville</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={oppForm.ville}
                  onChange={(e) => setOppForm({ ...oppForm, ville: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Marques (liste séparée par des virgules)</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={oppForm.marques}
                  onChange={(e) => setOppForm({ ...oppForm, marques: e.target.value })}
                  placeholder="Ex: Manitou, Kalmar"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Modèles (liste séparée par des virgules)</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={oppForm.modeles}
                  onChange={(e) => setOppForm({ ...oppForm, modeles: e.target.value })}
                  placeholder="Modèles associés"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Quantités</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={oppForm.quantites}
                  onChange={(e) => setOppForm({ ...oppForm, quantites: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">CA HT potentiel</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={oppForm.montant_estime}
                  onChange={(e) => setOppForm({ ...oppForm, montant_estime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Devise</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={oppForm.devise}
                  onChange={(e) => setOppForm({ ...oppForm, devise: e.target.value })}
                >
                  <option value="XAF">XAF</option>
                  <option value="XOF">XOF</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">% Marge</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={oppForm.pourcentage_marge}
                  onChange={(e) => setOppForm({ ...oppForm, pourcentage_marge: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Taux de clôture (%)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={oppForm.taux_cloture_percent}
                  onChange={(e) => setOppForm({ ...oppForm, taux_cloture_percent: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date de closing prévue</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={oppForm.date_closing_prevue}
                  onChange={(e) => setOppForm({ ...oppForm, date_closing_prevue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Statut</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={oppForm.statut}
                  onChange={(e) => setOppForm({ ...oppForm, statut: e.target.value })}
                >
                  <option value="En_cours">En cours</option>
                  <option value="Gagnee">Gagnée</option>
                  <option value="Reportee">Reportée</option>
                  <option value="Abandonnee">Abandonnée</option>
                  <option value="Perdue">Perdue</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Visite associée</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={oppForm.visite_id}
                  onChange={(e) => setOppForm({ ...oppForm, visite_id: e.target.value })}
                >
                  <option value="">Sans lien</option>
                  {visites.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nom_client} - {new Date(v.date_visite).toLocaleDateString('fr-FR')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={oppForm.notes}
                  onChange={(e) => setOppForm({ ...oppForm, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {submitError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsOppModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                disabled={submitLoading}
              >
                Annuler
              </button>
              <button
                onClick={submitOpp}
                disabled={submitLoading || !profile?.filiale_id}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60"
              >
                {submitLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLossModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsLossModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Vente perdue</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!profile?.filiale_id && (
                <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Aucune filiale assignée au profil. Contactez un administrateur pour pouvoir saisir.
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Client potentiel *</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={lossForm.client_potentiel}
                  onChange={(e) => setLossForm({ ...lossForm, client_potentiel: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Pays</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={lossForm.pays}
                  onChange={(e) => setLossForm({ ...lossForm, pays: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Catégorie produit</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={lossForm.categorie_produit}
                  onChange={(e) => setLossForm({ ...lossForm, categorie_produit: e.target.value })}
                  placeholder="Machine, piece, service..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Article (optionnel)</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={lossForm.article_id}
                  onChange={(e) => setLossForm({ ...lossForm, article_id: e.target.value })}
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
                  value={lossForm.montant_estime}
                  onChange={(e) => setLossForm({ ...lossForm, montant_estime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Motif de perte</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={lossForm.motif_perte || 'Prix'}
                  onChange={(e) => setLossForm({ ...lossForm, motif_perte: e.target.value as LostSale['motif_perte'] })}
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
                  value={lossForm.concurrent}
                  onChange={(e) => setLossForm({ ...lossForm, concurrent: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date opportunité</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={lossForm.date_opportunite}
                  onChange={(e) => setLossForm({ ...lossForm, date_opportunite: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Commentaires / analyse</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={lossForm.commentaires}
                  onChange={(e) => setLossForm({ ...lossForm, commentaires: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {submitError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsLossModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                disabled={submitLoading}
              >
                Annuler
              </button>
              <button
                onClick={submitLoss}
                disabled={submitLoading || !profile?.filiale_id}
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
