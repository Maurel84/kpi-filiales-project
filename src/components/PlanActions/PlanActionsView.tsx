import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFilialeContext } from '../../contexts/FilialeContext';
import { supabase } from '../../lib/supabase';
import { Plus, Calendar, User, AlertCircle, CheckCircle, Clock, XCircle, X } from 'lucide-react';
import { ModalTabs } from '../ui/ModalTabs';

interface PlanAction {
  id: string;
  date_action: string;
  action: string;
  niveau_priorite: 'Haute' | 'Moyenne' | 'Basse';
  responsable_nom: string | null;
  date_fin_prevue: string | null;
  statut: 'En_cours' | 'Retard' | 'Termine' | 'Annule';
  commentaires: string | null;
  filiale_id?: string | null;
}

type PlanActionInsert = Omit<PlanAction, 'id'>;
type PlanStatutFilter = PlanAction['statut'] | 'all';
type PlanPrioriteFilter = PlanAction['niveau_priorite'] | 'all';

export function PlanActionsView() {
  const { profile } = useAuth();
  const { filialeId, isAdmin } = useFilialeContext();
  const [actions, setActions] = useState<PlanAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState<PlanStatutFilter>('all');
  const [filterPriorite, setFilterPriorite] = useState<PlanPrioriteFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'notes'>('details');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    date_action: new Date().toISOString().slice(0, 10),
    action: '',
    niveau_priorite: 'Moyenne' as PlanAction['niveau_priorite'],
    responsable_nom: '',
    date_fin_prevue: '',
    statut: 'En_cours' as PlanAction['statut'],
    commentaires: '',
    filiale_id: null as string | null,
  });

  const loadActions = useCallback(async () => {
    if (!profile) return;

    let query = supabase.from('plan_actions').select('*').order('date_fin_prevue', { ascending: true });

    if (!isAdmin && filialeId) {
      query = query.eq('filiale_id', filialeId);
    }

    if (filterStatut !== 'all') {
      query = query.eq('statut', filterStatut);
    }

    if (filterPriorite !== 'all') {
      query = query.eq('niveau_priorite', filterPriorite);
    }

    const { data, error } = await query;

    if (!error && data) {
      setActions(data as PlanAction[]);
    }

    setLoading(false);
  }, [filialeId, filterPriorite, filterStatut, isAdmin, profile]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      ...prev,
      responsable_nom: prev.responsable_nom || `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim(),
      filiale_id: filialeId || null,
    }));
  }, [filialeId, profile]);

  useEffect(() => {
    if (isModalOpen) {
      setActiveTab('details');
    }
  }, [isModalOpen]);

  const submitAction = async () => {
    if (!profile) {
      setSubmitError('Aucun profil connecte.');
      return;
    }
    if (!filialeId) {
      setSubmitError(
        isAdmin
          ? 'Selectionnez une filiale active pour creer une action.'
          : 'Associez une filiale pour creer une action.'
      );
      return;
    }

    if (!formData.action.trim()) {
      setSubmitError('Action obligatoire.');
      return;
    }

    setSubmitError('');
    setSubmitLoading(true);

    const payload: PlanActionInsert = {
      date_action: formData.date_action,
      action: formData.action.trim(),
      niveau_priorite: formData.niveau_priorite,
      responsable_nom: formData.responsable_nom || null,
      date_fin_prevue: formData.date_fin_prevue || null,
      statut: formData.statut,
      commentaires: formData.commentaires || null,
      filiale_id: filialeId,
    };

    const { error } = await supabase.from('plan_actions').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }

    setSubmitLoading(false);
    setIsModalOpen(false);
    setFormData({
      date_action: new Date().toISOString().slice(0, 10),
      action: '',
      niveau_priorite: 'Moyenne',
      responsable_nom: '',
      date_fin_prevue: '',
      statut: 'En_cours',
      commentaires: '',
      filiale_id: filialeId,
    });
    loadActions();
  };

  const getStatutIcon = (statut: string) => {
    const icons = {
      En_cours: Clock,
      Retard: AlertCircle,
      Termine: CheckCircle,
      Annule: XCircle,
    };
    return icons[statut as keyof typeof icons] || Clock;
  };

  const getStatutBadge = (statut: string) => {
    const badges = {
      En_cours: 'bg-blue-100 text-blue-800',
      Retard: 'bg-red-100 text-red-800',
      Termine: 'bg-emerald-100 text-emerald-800',
      Annule: 'bg-slate-100 text-slate-800',
    };
    return badges[statut as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getPrioriteBadge = (priorite: string) => {
    const badges = {
      Haute: 'bg-red-100 text-red-800',
      Moyenne: 'bg-amber-100 text-amber-800',
      Basse: 'bg-green-100 text-green-800',
    };
    return badges[priorite as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getStatutLabel = (statut: string) => {
    const labels = {
      En_cours: 'En cours',
      Retard: 'En retard',
      Termine: 'Terminee',
      Annule: 'Annulee',
    };
    return labels[statut as keyof typeof labels] || statut;
  };

  const isRetard = (action: PlanAction) => {
    if (!action.date_fin_prevue || action.statut === 'Termine' || action.statut === 'Annule') {
      return false;
    }
    return new Date(action.date_fin_prevue) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const stats = {
    enCours: actions.filter((a) => a.statut === 'En_cours').length,
    enRetard: actions.filter((a) => isRetard(a)).length,
    terminees: actions.filter((a) => a.statut === 'Termine').length,
    haute: actions.filter((a) => a.niveau_priorite === 'Haute' && a.statut !== 'Termine').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Plan d'Actions</h1>
          <p className="text-slate-600">Suivi des actions et priorites</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Nouvelle action</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">En cours</p>
              <p className="text-2xl font-bold text-blue-600">{stats.enCours}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">En retard</p>
              <p className="text-2xl font-bold text-red-600">{stats.enRetard}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Terminees</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.terminees}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Priorite haute</p>
              <p className="text-2xl font-bold text-red-600">{stats.haute}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value as PlanStatutFilter)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="En_cours">En cours</option>
            <option value="Retard">En retard</option>
            <option value="Termine">Terminee</option>
            <option value="Annule">Annulee</option>
          </select>

          <select
            value={filterPriorite}
            onChange={(e) => setFilterPriorite(e.target.value as PlanPrioriteFilter)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">Toutes les priorites</option>
            <option value="Haute">Priorite haute</option>
            <option value="Moyenne">Priorite moyenne</option>
            <option value="Basse">Priorite basse</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Action</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Priorite</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Responsable</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Echeance</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {actions.map((action) => {
                const StatusIcon = getStatutIcon(action.statut);
                const enRetard = isRetard(action);
                return (
                  <tr key={action.id} className={`hover:bg-slate-50 transition ${enRetard ? 'bg-red-50/30' : ''}`}>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(action.date_action).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{action.action}</p>
                        {action.commentaires && (
                          <p className="text-xs text-slate-500 mt-1">{action.commentaires}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPrioriteBadge(action.niveau_priorite)}`}>
                        {action.niveau_priorite}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{action.responsable_nom || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {action.date_fin_prevue ? new Date(action.date_fin_prevue).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatutBadge(action.statut)}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {getStatutLabel(action.statut)}
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

          {actions.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Aucune action trouvee</p>
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

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Ajouter une action</h2>
            <ModalTabs
              tabs={[
                { id: 'details', label: 'Details' },
                { id: 'notes', label: 'Notes' },
              ]}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
            />

            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Action</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Priorite</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.niveau_priorite}
                    onChange={(e) => setFormData({ ...formData, niveau_priorite: e.target.value as PlanAction['niveau_priorite'] })}
                  >
                    <option value="Haute">Haute</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Basse">Basse</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Date d'action</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.date_action}
                    onChange={(e) => setFormData({ ...formData, date_action: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Echeance</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.date_fin_prevue ?? ''}
                    onChange={(e) => setFormData({ ...formData, date_fin_prevue: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Responsable</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.responsable_nom ?? ''}
                    onChange={(e) => setFormData({ ...formData, responsable_nom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Statut</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value as PlanAction['statut'] })}
                  >
                    <option value="En_cours">En cours</option>
                    <option value="Retard">Retard</option>
                    <option value="Termine">Terminee</option>
                    <option value="Annule">Annulee</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Commentaires</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  rows={3}
                  value={formData.commentaires ?? ''}
                  onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
                />
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
                onClick={submitAction}
                disabled={submitLoading || !formData.action}
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
