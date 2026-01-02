import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFilialeContext } from '../../contexts/FilialeContext';
import { supabase } from '../../lib/supabase';
import { Plus, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { ModalTabs } from '../ui/ModalTabs';

type KPI = Database['public']['Tables']['kpis_reporting']['Row'];
type KPITypeFilter = KPI['type_kpi'] | 'all';
type KPIStatusFilter = KPI['status'] | 'all';

export function KPIsView() {
  const { profile } = useAuth();
  const { filialeId, isAdmin } = useFilialeContext();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<KPITypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<KPIStatusFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'indicateur' | 'cible' | 'notes'>('indicateur');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    type_kpi: 'Financier' as KPI['type_kpi'],
    valeur: 0,
    unite: '',
    cible: null as number | null,
    mois_cloture: new Date().toISOString().slice(0, 7),
    annee: new Date().getFullYear(),
    commentaires: '',
    cause_ecart: '',
    status: 'Draft' as KPI['status'],
    ligne: null as number | null,
  });

  const loadKPIs = useCallback(async () => {
    if (!profile) return;
    if (!isAdmin && !filialeId) {
      setKpis([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('kpis_reporting')
      .select('*')
      .order('date_entree', { ascending: false })
      .limit(100);

    if (filialeId) {
      query = query.eq('filiale_id', filialeId);
    }

    if (typeFilter !== 'all') {
      query = query.eq('type_kpi', typeFilter);
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setKpis(data as KPI[]);
    }

    setLoading(false);
  }, [filialeId, isAdmin, profile, statusFilter, typeFilter]);

  const submitKPI = async () => {
    if (!profile) return;
    if (!filialeId) {
      setSubmitError(
        isAdmin
          ? 'Selectionnez une filiale active pour saisir un KPI.'
          : 'Associez une filiale pour saisir un KPI.'
      );
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);
    const payload = {
      title: formData.title || null,
      type_kpi: formData.type_kpi,
      valeur: Number(formData.valeur) || 0,
      cible: formData.cible ?? null,
      unite: formData.unite || null,
      mois_cloture: formData.mois_cloture,
      annee: Number(formData.annee) || new Date().getFullYear(),
      commentaires: formData.commentaires || null,
      cause_ecart: formData.cause_ecart || null,
      status: formData.status,
      ligne: formData.ligne,
      filiale_id: filialeId,
      responsable_saisie_id: profile.id,
      date_entree: new Date().toISOString(),
    };
    const { error } = await supabase.from('kpis_reporting').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    setSubmitLoading(false);
    setIsModalOpen(false);
    setFormData({
      title: '',
      type_kpi: 'Financier',
      valeur: 0,
      unite: '',
      cible: null,
      mois_cloture: new Date().toISOString().slice(0, 7),
      annee: new Date().getFullYear(),
      commentaires: '',
      cause_ecart: '',
      status: 'Draft',
      ligne: null,
    });
    loadKPIs();
  };

  useEffect(() => {
    loadKPIs();
  }, [loadKPIs]);

  useEffect(() => {
    if (isModalOpen) {
      setActiveTab('indicateur');
    }
  }, [isModalOpen]);

  const getStatusIcon = (status: string) => {
    const icons = {
      Draft: Clock,
      Submitted: Clock,
      Approved: CheckCircle,
      Closed: CheckCircle,
      Reopened_by_Mgmt: AlertCircle,
    };
    return icons[status as keyof typeof icons] || Clock;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      Draft: 'bg-slate-100 text-slate-800',
      Submitted: 'bg-blue-100 text-blue-800',
      Approved: 'bg-emerald-100 text-emerald-800',
      Closed: 'bg-slate-100 text-slate-800',
      Reopened_by_Mgmt: 'bg-amber-100 text-amber-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      Draft: 'Brouillon',
      Submitted: 'Soumis',
      Approved: 'Approuvé',
      Closed: 'Clôturé',
      Reopened_by_Mgmt: 'Réouvert',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const canEdit = (kpi: KPI) => {
    if (profile?.role === 'admin_siege') return true;
    return kpi.status !== 'Closed';
  };

  const canValidate = (kpi: KPI) => {
    if (profile?.role === 'admin_siege') return true;
    if (profile?.role === 'manager_filiale' && kpi.status === 'Submitted') return true;
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const stats = {
    draft: kpis.filter(k => k.status === 'Draft').length,
    submitted: kpis.filter(k => k.status === 'Submitted').length,
    approved: kpis.filter(k => k.status === 'Approved').length,
    closed: kpis.filter(k => k.status === 'Closed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">KPIs & Reporting</h1>
          <p className="text-slate-600">Suivi des indicateurs de performance par filiale</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Nouveau KPI</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Brouillons</p>
              <p className="text-2xl font-bold text-slate-900">{stats.draft}</p>
            </div>
            <Clock className="w-8 h-8 text-slate-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">A valider</p>
              <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Approuves</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Clotures</p>
              <p className="text-2xl font-bold text-slate-900">{stats.closed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as KPITypeFilter)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">Tous les types</option>
            <option value="Production">Production</option>
            <option value="Rendement">Rendement</option>
            <option value="Heures">Heures</option>
            <option value="Couts">Couts</option>
            <option value="Manutention">Manutention</option>
            <option value="Agriculture">Agriculture</option>
            <option value="RH">RH</option>
            <option value="Financier">Financier</option>
            <option value="Autre">Autre</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as KPIStatusFilter)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="Draft">Brouillon</option>
            <option value="Submitted">Soumis</option>
            <option value="Approved">Approuve</option>
            <option value="Closed">Cloture</option>
            <option value="Reopened_by_Mgmt">Rouvert</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Periode</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Valeur</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date saisie</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {kpis.map((kpi) => {
                const StatusIcon = getStatusIcon(kpi.status);
                return (
                  <tr key={kpi.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{kpi.type_kpi}</p>
                        {kpi.ligne && (
                          <p className="text-xs text-slate-500">Ligne {kpi.ligne}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900">{kpi.mois_cloture}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-baseline space-x-1">
                        <span className="text-sm font-medium text-slate-900">
                          {kpi.valeur !== null ? kpi.valeur.toLocaleString() : '-'}
                        </span>
                        {kpi.unite && <span className="text-xs text-slate-500">{kpi.unite}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(kpi.date_entree).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(kpi.status)}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {getStatusLabel(kpi.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {canEdit(kpi) && (
                          <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                            Modifier
                          </button>
                        )}
                        {canValidate(kpi) && (
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Valider
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {kpis.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Aucun KPI trouve</p>
            </div>
          )}
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

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Ajouter un KPI</h2>
            <ModalTabs
              tabs={[
                { id: 'indicateur', label: 'Indicateur' },
                { id: 'cible', label: 'Cible' },
                { id: 'notes', label: 'Notes' },
              ]}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
            />

            {activeTab === 'indicateur' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Indicateur</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Marge par machine, Taux conversion"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Type</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.type_kpi}
                    onChange={(e) => setFormData({ ...formData, type_kpi: e.target.value as KPI['type_kpi'] })}
                  >
                    <option value="Financier">Financier</option>
                    <option value="Production">Production</option>
                    <option value="Rendement">Rendement</option>
                    <option value="Heures">Heures</option>
                    <option value="Couts">Couts</option>
                    <option value="Manutention">Manutention</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="RH">RH</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Valeur</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.valeur}
                    onChange={(e) => setFormData({ ...formData, valeur: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Unite</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.unite}
                    onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                  />
                </div>
              </div>
            )}

            {activeTab === 'cible' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Cible</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.cible ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, cible: value === '' ? null : Number(value) });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Mois cloture (YYYY-MM)</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.mois_cloture}
                    onChange={(e) => setFormData({ ...formData, mois_cloture: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Annee</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.annee}
                    onChange={(e) => setFormData({ ...formData, annee: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Statut</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as KPI['status'] })}
                  >
                    <option value="Draft">Brouillon</option>
                    <option value="Submitted">Soumis</option>
                    <option value="Approved">Approuve</option>
                    <option value="Closed">Cloture</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Cause ecart</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    rows={2}
                    value={formData.cause_ecart}
                    onChange={(e) => setFormData({ ...formData, cause_ecart: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Commentaires</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    rows={3}
                    value={formData.commentaires}
                    onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
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
                onClick={submitKPI}
                disabled={submitLoading || !formData.mois_cloture}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
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






