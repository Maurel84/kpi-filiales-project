import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Calendar, User, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface PlanAction {
  id: string;
  date_action: string;
  action: string;
  niveau_priorite: 'Haute' | 'Moyenne' | 'Basse';
  responsable_nom: string | null;
  date_fin_prevue: string | null;
  statut: 'En_cours' | 'Retard' | 'Termine' | 'Annule';
  commentaires: string | null;
}

export function PlanActionsView() {
  const { profile } = useAuth();
  const [actions, setActions] = useState<PlanAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterPriorite, setFilterPriorite] = useState<string>('all');

  useEffect(() => {
    loadActions();
  }, [profile, filterStatut, filterPriorite]);

  const loadActions = async () => {
    if (!profile) return;

    let query = supabase
      .from('plan_actions')
      .select('*')
      .order('date_fin_prevue', { ascending: true });

    if (profile.role !== 'admin_siege' && profile.filiale_id) {
      query = query.eq('filiale_id', profile.filiale_id);
    }

    if (filterStatut !== 'all') {
      query = query.eq('statut', filterStatut);
    }

    if (filterPriorite !== 'all') {
      query = query.eq('niveau_priorite', filterPriorite);
    }

    const { data, error } = await query;

    if (!error && data) {
      setActions(data);
    }

    setLoading(false);
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
      Termine: 'Terminé',
      Annule: 'Annulé',
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
    enCours: actions.filter(a => a.statut === 'En_cours').length,
    enRetard: actions.filter(a => isRetard(a)).length,
    terminees: actions.filter(a => a.statut === 'Termine').length,
    haute: actions.filter(a => a.niveau_priorite === 'Haute' && a.statut !== 'Termine').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Plan d'Actions</h1>
          <p className="text-slate-600">
            Suivi des actions et priorités
          </p>
        </div>
        <button className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition shadow-lg hover:shadow-xl">
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
              <p className="text-sm text-slate-600">Terminées</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.terminees}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Priorité haute</p>
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
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="En_cours">En cours</option>
            <option value="Retard">En retard</option>
            <option value="Termine">Terminé</option>
            <option value="Annule">Annulé</option>
          </select>

          <select
            value={filterPriorite}
            onChange={(e) => setFilterPriorite(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">Toutes les priorités</option>
            <option value="Haute">Priorité haute</option>
            <option value="Moyenne">Priorité moyenne</option>
            <option value="Basse">Priorité basse</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Action
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Priorité
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Responsable
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Échéance
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
                    <td className="py-3 px-4 text-sm">
                      {action.date_fin_prevue ? (
                        <span className={enRetard ? 'text-red-600 font-medium' : 'text-slate-900'}>
                          {new Date(action.date_fin_prevue).toLocaleDateString('fr-FR')}
                          {enRetard && <AlertCircle className="w-4 h-4 inline ml-1" />}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
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
              <p className="text-slate-600">Aucune action trouvée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
