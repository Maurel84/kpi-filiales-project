import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, Target, TrendingUp, Users, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useFilialeContext } from '../../contexts/FilialeContext';
import type { Database } from '../../lib/database.types';
import { ModalTabs } from '../ui/ModalTabs';

type Visite = Database['public']['Tables']['visites_clients']['Row'];
type Opportunite = Database['public']['Tables']['opportunites']['Row'];
type OpportuniteInsert = Database['public']['Tables']['opportunites']['Insert'];
type OpportuniteStatus = NonNullable<Database['public']['Tables']['opportunites']['Row']['statut']>;
type LostSale = Database['public']['Tables']['ventes_perdues']['Row'];

type OppForm = {
  nom_projet: string;
  ville: string;
  marques: string;
  modeles: string;
  quantites: string;
  ca_ht_potentiel: string;
  pourcentage_marge: string;
  date_closing_prevue: string;
  statut: OpportuniteStatus;
  taux_cloture_percent: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export function VisitesClientsView() {
  const { profile } = useAuth();
  const { filialeId, isAdmin } = useFilialeContext();
  const [activeTab, setActiveTab] = useState<'visites' | 'opportunites' | 'pertes'>('visites');
  const [visites, setVisites] = useState<Visite[]>([]);
  const [opportunites, setOpportunites] = useState<Opportunite[]>([]);
  const [pertes, setPertes] = useState<LostSale[]>([]);
  const [loading, setLoading] = useState(true);
  const filialeMissingMessage = isAdmin
    ? 'Selectionnez une filiale active pour continuer.'
    : 'Aucune filiale assignee au profil. Contactez un administrateur.';
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<'all' | OpportuniteStatus>('all');

  const [isVisiteModal, setIsVisiteModal] = useState(false);
  const [isOppModal, setIsOppModal] = useState(false);
  const [isLossModal, setIsLossModal] = useState(false);
  const [visiteModalTab, setVisiteModalTab] = useState<'client' | 'contact'>('client');
  const [oppModalTab, setOppModalTab] = useState<'projet' | 'produits' | 'finances'>('projet');
  const [lossModalTab, setLossModalTab] = useState<'concurrence' | 'notes'>('concurrence');

  const [visiteForm, setVisiteForm] = useState({
    date_visite: today(),
    nom_client: '',
    prenom_client: '',
    fonction_client: '',
    telephone_client: '',
    whatsapp_client: '',
    email_client: '',
    url_societe_client: '',
  });

  const [oppForm, setOppForm] = useState<OppForm>({
    nom_projet: '',
    ville: '',
    marques: '',
    modeles: '',
    quantites: '1',
    ca_ht_potentiel: '',
    pourcentage_marge: '',
    date_closing_prevue: '',
    statut: 'En_cours',
    taux_cloture_percent: '0',
  });

  const [lossForm, setLossForm] = useState({
    a_participe: true,
    marque_concurrent: '',
    modele_concurrent: '',
    prix_concurrent: '',
    commentaires: '',
  });

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    if (!isAdmin && !filialeId) {
      setVisites([]);
      setOpportunites([]);
      setPertes([]);
      setLoading(false);
      return;
    }

    let visitesQuery = supabase
      .from('visites_clients')
      .select('*')
      .order('date_visite', { ascending: false })
      .limit(200);
    let oppQuery = supabase
      .from('opportunites')
      .select('*')
      .order('date_closing_prevue', { ascending: false })
      .limit(200);
    let pertesQuery = supabase
      .from('ventes_perdues')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filialeId) {
      visitesQuery = visitesQuery.eq('filiale_id', filialeId);
      oppQuery = oppQuery.eq('filiale_id', filialeId);
      pertesQuery = pertesQuery.eq('filiale_id', filialeId);
    }

    const [{ data: visitesData }, { data: oppData }, { data: pertesData }] = await Promise.all([
      visitesQuery,
      oppQuery,
      pertesQuery,
    ]);

    if (visitesData) setVisites(visitesData as Visite[]);
    if (oppData) setOpportunites(oppData as Opportunite[]);
    if (pertesData) setPertes(pertesData as LostSale[]);

    setLoading(false);
  }, [filialeId, isAdmin, profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const oppEnCours = opportunites.filter((o) => o.statut === 'En_cours').length;
    const oppGagnees = opportunites.filter((o) => o.statut === 'Gagne').length;
    const caPotentiel = opportunites.reduce((sum, o) => sum + (Number(o.ca_ht_potentiel) || 0), 0);
    return { oppEnCours, oppGagnees, caPotentiel };
  }, [opportunites]);

  const resetErrors = () => setSubmitError('');

  const submitVisite = async () => {
    if (!profile) return;
    if (!filialeId) {
      setSubmitError(filialeMissingMessage);
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
      created_by: profile.id,
    };
    const { error } = await supabase.from('visites_clients').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    await loadData();
    setSubmitLoading(false);
    setIsVisiteModal(false);
    setVisiteForm({
      ...visiteForm,
      nom_client: '',
      prenom_client: '',
      fonction_client: '',
    });
  };

  const submitOpp = async () => {
    if (!profile) return;
    if (!filialeId) {
      setSubmitError(filialeMissingMessage);
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
    const payload: OpportuniteInsert = {
      filiale_id: filialeId,
      nom_projet: oppForm.nom_projet.trim(),
      ville: oppForm.ville || null,
      marques: marquesArr,
      modeles: modelesArr,
      quantites: oppForm.quantites ? Number(oppForm.quantites) : null,
      ca_ht_potentiel: oppForm.ca_ht_potentiel ? Number(oppForm.ca_ht_potentiel) : null,
      pourcentage_marge: oppForm.pourcentage_marge ? Number(oppForm.pourcentage_marge) : null,
      date_closing_prevue: oppForm.date_closing_prevue || null,
      statut: oppForm.statut,
      taux_cloture_percent: Number(oppForm.taux_cloture_percent) || 0,
      created_by: profile.id,
    };
    const { error } = await supabase.from('opportunites').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    await loadData();
    setSubmitLoading(false);
    setIsOppModal(false);
    setOppForm({
      ...oppForm,
      nom_projet: '',
      ville: '',
      marques: '',
      modeles: '',
      quantites: '1',
      ca_ht_potentiel: '',
      pourcentage_marge: '',
      taux_cloture_percent: '0',
    });
  };

  const submitLoss = async () => {
    if (!profile) return;
    if (!filialeId) {
      setSubmitError(filialeMissingMessage);
      return;
    }
    if (!lossForm.marque_concurrent.trim() && !lossForm.commentaires.trim()) {
      setSubmitError('Renseignez au moins une marque concurrente ou un commentaire.');
      return;
    }
    resetErrors();
    setSubmitLoading(true);
    const payload = {
      filiale_id: filialeId,
      a_participe: lossForm.a_participe,
      marque_concurrent: lossForm.marque_concurrent || null,
      modele_concurrent: lossForm.modele_concurrent || null,
      prix_concurrent: lossForm.prix_concurrent === '' ? null : Number(lossForm.prix_concurrent),
      commentaires: lossForm.commentaires || null,
      created_by: profile.id,
    };
    const { error } = await supabase.from('ventes_perdues').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    await loadData();
    setSubmitLoading(false);
    setIsLossModal(false);
    setLossForm({
      a_participe: true,
      marque_concurrent: '',
      modele_concurrent: '',
      prix_concurrent: '',
      commentaires: '',
    });
  };

  const renderTabs = () => (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
      {[
        { key: 'visites', label: 'Visites' },
        { key: 'opportunites', label: 'Opportunites' },
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Visites & Opportunites</h1>
          <p className="text-slate-600">
            Saisie des visites clients, opportunites associees et ventes perdues (conforme au PDF).
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setSubmitError('');
              setIsVisiteModal(true);
              setVisiteModalTab('client');
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow hover:from-emerald-600 hover:to-teal-700"
          >
            + Nouvelle visite
          </button>
          <button
            onClick={() => {
              setSubmitError('');
              setIsOppModal(true);
              setOppModalTab('projet');
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow hover:from-blue-600 hover:to-indigo-700"
          >
            + Opportunite
          </button>
          <button
            onClick={() => {
              setSubmitError('');
              setIsLossModal(true);
              setLossModalTab('concurrence');
            }}
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
            <p className="text-sm text-slate-500">Opp. gagnees</p>
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
              {stats.caPotentiel.toLocaleString('fr-FR')} XAF
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
              onChange={(e) => setSelectedStatut(e.target.value as 'all' | OpportuniteStatus)}
            >
              <option value="all">Tous les statuts</option>
              <option value="En_cours">En cours</option>
              <option value="Gagne">Gagne</option>
              <option value="Reporte">Reporte</option>
              <option value="Abandonne">Abandonne</option>
              <option value="Perdu">Perdu</option>
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Telephone</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Site</th>
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
                      {[v.telephone_client, v.whatsapp_client].filter(Boolean).join(' / ') || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">{v.email_client || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{v.url_societe_client || 'N/A'}</td>
                  </tr>
                ))}
                {visites.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-sm text-slate-500" colSpan={6}>
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
                      <span className="text-slate-500">Marques:</span>{' '}
                      {(o.marques || []).join(', ') || 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-500">Modeles:</span>{' '}
                      {(o.modeles || []).join(', ') || 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-500">Quantites:</span> {o.quantites || 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-500">CA potentiel:</span>{' '}
                      {o.ca_ht_potentiel ? o.ca_ht_potentiel.toLocaleString('fr-FR') : 'N/A'} XAF
                    </div>
                    <div>
                      <span className="text-slate-500">% Marge:</span>{' '}
                      {o.pourcentage_marge ?? 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-500">Closing:</span>{' '}
                      {o.date_closing_prevue
                        ? new Date(o.date_closing_prevue).toLocaleDateString('fr-FR')
                        : 'N/A'}
                    </div>
                    <div>
                      <span className="text-slate-500">Taux cloture:</span>{' '}
                      {o.taux_cloture_percent ?? 0}%
                    </div>
                  </div>
                </div>
              ))}
            {opportunites.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-500">
                Aucune opportunite saisie.
              </div>
            )}
          </div>
        )}

        {activeTab === 'pertes' && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Participation</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Marque concurrence</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Modele concurrence</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Prix concurrence</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Commentaires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pertes.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {p.a_participe === null ? 'N/A' : p.a_participe ? 'Participe' : 'Non participe'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">{p.marque_concurrent || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{p.modele_concurrent || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {p.prix_concurrent ? p.prix_concurrent.toLocaleString('fr-FR') : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 max-w-sm">
                      {p.commentaires || 'N/A'}
                    </td>
                  </tr>
                ))}
                {pertes.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-sm text-slate-500" colSpan={6}>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative">
            <button
              onClick={() => setIsVisiteModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Nouvelle visite</h2>
            <ModalTabs
              tabs={[
                { id: 'client', label: 'Client' },
                { id: 'contact', label: 'Contact' },
              ]}
              activeTab={visiteModalTab}
              onChange={(key) => setVisiteModalTab(key as typeof visiteModalTab)}
            />
            {!filialeId && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {filialeMissingMessage}
              </div>
            )}
            {visiteModalTab === 'client' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Date</label>
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
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Prenom</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={visiteForm.prenom_client}
                    onChange={(e) => setVisiteForm({ ...visiteForm, prenom_client: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Fonction</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={visiteForm.fonction_client}
                    onChange={(e) => setVisiteForm({ ...visiteForm, fonction_client: e.target.value })}
                  />
                </div>
              </div>
            )}
            {visiteModalTab === 'contact' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Telephone</label>
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
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Site / LinkedIn</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={visiteForm.url_societe_client}
                    onChange={(e) => setVisiteForm({ ...visiteForm, url_societe_client: e.target.value })}
                    placeholder="https://"
                  />
                </div>
              </div>
            )}
            {submitError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{submitError}</span>
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
                disabled={submitLoading || !filialeId}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
              >
                {submitLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isOppModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative">
            <button
              onClick={() => setIsOppModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Nouvelle opportunite</h2>
            <ModalTabs
              tabs={[
                { id: 'projet', label: 'Projet' },
                { id: 'produits', label: 'Produits' },
                { id: 'finances', label: 'Finances' },
              ]}
              activeTab={oppModalTab}
              onChange={(key) => setOppModalTab(key as typeof oppModalTab)}
            />
            {!filialeId && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {filialeMissingMessage}
              </div>
            )}
            {oppModalTab === 'projet' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Projet / Opportunite *</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={oppForm.nom_projet}
                    onChange={(e) => setOppForm({ ...oppForm, nom_projet: e.target.value })}
                    placeholder="Intitule du projet"
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
                  <label className="text-sm font-medium text-slate-700">Date de closing prevue</label>
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
                    onChange={(e) =>
                      setOppForm({ ...oppForm, statut: e.target.value as OpportuniteStatus })
                    }
                  >
                    <option value="En_cours">En cours</option>
                    <option value="Gagne">Gagne</option>
                    <option value="Reporte">Reporte</option>
                    <option value="Abandonne">Abandonne</option>
                    <option value="Perdu">Perdu</option>
                  </select>
                </div>
              </div>
            )}
            {oppModalTab === 'produits' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Marques (liste separee par des virgules)</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={oppForm.marques}
                    onChange={(e) => setOppForm({ ...oppForm, marques: e.target.value })}
                    placeholder="Ex: Manitou, Kalmar"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Modeles (liste separee par des virgules)</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={oppForm.modeles}
                    onChange={(e) => setOppForm({ ...oppForm, modeles: e.target.value })}
                    placeholder="Modeles associes"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Quantites</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={oppForm.quantites}
                    onChange={(e) => setOppForm({ ...oppForm, quantites: e.target.value })}
                  />
                </div>
              </div>
            )}
            {oppModalTab === 'finances' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">CA HT potentiel</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={oppForm.ca_ht_potentiel}
                    onChange={(e) => setOppForm({ ...oppForm, ca_ht_potentiel: e.target.value })}
                  />
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
                  <label className="text-sm font-medium text-slate-700">Taux de cloture (%)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={oppForm.taux_cloture_percent}
                    onChange={(e) => setOppForm({ ...oppForm, taux_cloture_percent: e.target.value })}
                  />
                </div>
              </div>
            )}

            {submitError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{submitError}</span>
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
                disabled={submitLoading || !filialeId}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60"
              >
                {submitLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLossModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative">
            <button
              onClick={() => setIsLossModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Vente perdue</h2>
            <ModalTabs
              tabs={[
                { id: 'concurrence', label: 'Concurrence' },
                { id: 'notes', label: 'Notes' },
              ]}
              activeTab={lossModalTab}
              onChange={(key) => setLossModalTab(key as typeof lossModalTab)}
            />
            {!filialeId && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {filialeMissingMessage}
              </div>
            )}
            {lossModalTab === 'concurrence' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Participation</label>
                  <div className="flex items-center gap-4 rounded-lg border border-slate-200 px-3 py-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        checked={lossForm.a_participe === true}
                        onChange={() => setLossForm({ ...lossForm, a_participe: true })}
                      />
                      Participe
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        checked={lossForm.a_participe === false}
                        onChange={() => setLossForm({ ...lossForm, a_participe: false })}
                      />
                      Non participe
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Marque concurrence *</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={lossForm.marque_concurrent}
                    onChange={(e) => setLossForm({ ...lossForm, marque_concurrent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Modele concurrence</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={lossForm.modele_concurrent}
                    onChange={(e) => setLossForm({ ...lossForm, modele_concurrent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Prix concurrence</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={lossForm.prix_concurrent}
                    onChange={(e) => setLossForm({ ...lossForm, prix_concurrent: e.target.value })}
                  />
                </div>
              </div>
            )}
            {lossModalTab === 'notes' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Commentaires</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={lossForm.commentaires}
                    onChange={(e) => setLossForm({ ...lossForm, commentaires: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            )}

            {submitError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{submitError}</span>
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
                disabled={submitLoading || !filialeId}
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





