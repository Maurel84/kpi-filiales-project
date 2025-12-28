import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, ToggleLeft, ToggleRight, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type UserProfile = Database['public']['Tables']['users_profiles']['Row'];
type Filiale = Pick<Database['public']['Tables']['filiales']['Row'], 'id' | 'nom' | 'code' | 'actif'>;
type AuthEvent = Database['public']['Tables']['auth_events']['Row'];

const roleLabels: Record<UserProfile['role'], string> = {
  admin_siege: 'Admin siège',
  manager_filiale: 'Manager filiale',
  commercial: 'Commercial',
  technicien: 'Technicien',
  saisie: 'Saisie',
};

const defaultForm = {
  prenom: '',
  nom: '',
  email: '',
  password: '',
  role: 'manager_filiale' as UserProfile['role'],
  filiale_id: '',
  poste: '',
  actif: true,
};

type UsersManagementViewProps = {
  onNavigate?: (view: string) => void;
};

export function UsersManagementView({ onNavigate }: UsersManagementViewProps) {
  const { profile, signUp } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState(defaultForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authEventsError, setAuthEventsError] = useState('');

  const canManage = profile?.role === 'admin_siege';

  const filialeMap = useMemo(() => {
    return filiales.reduce<Record<string, string>>((acc, f) => {
      acc[f.id] = f.nom || f.code || 'Filiale';
      return acc;
    }, {});
  }, [filiales]);

  const uniqueAuthEvents = useMemo(() => {
    const seen = new Set<string>();
    return authEvents.filter((event) => {
      const timestamp = event.created_at ? event.created_at.slice(0, 16) : '';
      const key = `${event.user_id}|${event.event}|${timestamp}|${event.user_agent ?? ''}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [authEvents]);

  const recentAuthEvents = useMemo(() => uniqueAuthEvents.slice(0, 10), [uniqueAuthEvents]);

  useEffect(() => {
    const load = async () => {
      if (!canManage) {
        setLoading(false);
        return;
      }
      const [
        { data: usersData, error: usersError },
        { data: filialesData },
        { data: authEventsData, error: authEventsError },
      ] = await Promise.all([
        supabase.from('users_profiles').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('filiales').select('id, nom, code, actif').order('nom'),
        supabase.from('auth_events').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      if (usersError) {
        setError(usersError.message);
      }
      if (authEventsError) {
        setAuthEventsError(authEventsError.message);
      }
      if (usersData) {
        setUsers(usersData as UserProfile[]);
      }
      if (filialesData) {
        setFiliales(filialesData as Filiale[]);
      }
      if (authEventsData) {
        setAuthEvents(authEventsData as AuthEvent[]);
      }
      setLoading(false);
    };
    load();
  }, [canManage]);

  const refreshUsers = async () => {
    const { data } = await supabase.from('users_profiles').select('*').order('created_at', { ascending: false }).limit(200);
    if (data) {
      setUsers(data as UserProfile[]);
    }
  };

  const getUserLabel = (userId: string) => {
    const match = users.find((u) => u.id === userId);
    if (!match) return 'Utilisateur inconnu';
    const name = [match.prenom, match.nom].filter(Boolean).join(' ').trim();
    return name || match.email || userId;
  };

  const formatEventLabel = (event: AuthEvent['event']) => {
    return event === 'signed_in' ? 'Connexion' : 'Déconnexion';
  };

  const formatEventDate = (value: string) => {
    return new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const formatAuthEventsError = (message: string) => {
    const lower = message.toLowerCase();
    if (lower.includes('auth_events')) {
      return 'Journal des connexions indisponible: appliquez la migration auth_events puis relancez.';
    }
    return `Journal des connexions indisponible: ${message}`;
  };

  const handleCreate = async () => {
    setError('');
    setSuccess('');

    if (!canManage) {
      setError('Seul l\'administrateur siège peut créer des comptes.');
      return;
    }

    if (!formData.email || !formData.email.includes('@')) {
      setError('Email requis.');
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Mot de passe trop court (8 caractères minimum).');
      return;
    }
    if (!formData.prenom || !formData.nom) {
      setError('Prénom et nom sont requis.');
      return;
    }

    setSubmitLoading(true);
    const { error: signUpError } = await signUp(formData.email.trim().toLowerCase(), formData.password, {
      prenom: formData.prenom,
      nom: formData.nom,
      filiale_id: formData.filiale_id || undefined,
      role: formData.role,
      poste: formData.poste || undefined,
      actif: formData.actif,
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitLoading(false);
      return;
    }

    setSubmitLoading(false);
    setSuccess('Compte créé et rattaché à la filiale.');
    setFormData(defaultForm);
    await refreshUsers();
  };

  const toggleActive = async (user: UserProfile) => {
    setError('');
    setSuccess('');

    if (!canManage) {
      setError('Action réservée à l\'administrateur siège.');
      return;
    }
    if (user.id === profile?.id) {
      setError('Impossible de désactiver votre propre compte.');
      return;
    }

    const { error: updateError } = await supabase
      .from('users_profiles')
      .update({ actif: !user.actif })
      .eq('id', user.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, actif: !u.actif } : u)));
    setSuccess(`Accès ${!user.actif ? 'activé' : 'désactivé'} pour ${user.prenom || ''} ${user.nom || ''}`.trim());
  };

  if (!canManage) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-700">Accès réservé à l&apos;administrateur général.</p>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Utilisateurs & accès</h1>
          <p className="text-slate-600">Création des comptes, rattachement filiale et activation des accès.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-800 text-sm font-semibold">
          <ShieldCheck className="w-4 h-4" />
          Admin général
        </div>
      </div>

      {(error || success) && (
        <div
          className={`rounded-lg px-4 py-3 text-sm border ${
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Création</p>
            <h2 className="text-lg font-semibold text-slate-900">Nouveau compte utilisateur</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Prénom</label>
            <input
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={formData.prenom}
              onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nom</label>
            <input
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Mot de passe</label>
            <input
              type="password"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Au moins 8 caractères"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Rôle</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserProfile['role'] })}
            >
              {Object.entries(roleLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Filiale</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={formData.filiale_id}
              onChange={(e) => setFormData({ ...formData, filiale_id: e.target.value })}
            >
              <option value="">Aucune (siège)</option>
              {filiales.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom || f.code || 'Filiale'}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Poste (optionnel)</label>
            <input
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={formData.poste}
              onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
              placeholder="Intitulé du poste"
            />
          </div>
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, actif: !prev.actif }))}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${
                formData.actif
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {formData.actif ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {formData.actif ? 'Activer l\'accès immédiatement' : 'Créer en inactif'}
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleCreate}
            disabled={submitLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 font-semibold shadow hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
          >
            {submitLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            Créer le compte
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Comptes existants</h2>
            <p className="text-sm text-slate-600">Activez/désactivez les accès sans quitter le tableau de bord.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {users.filter((u) => u.actif).length} actifs / {users.length} au total
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Utilisateur</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Rôle</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Filiale</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Accès</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                    {user.prenom} {user.nom}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">{user.email}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {user.filiale_id ? filialeMap[user.filiale_id] || 'Filiale inconnue' : 'Siège'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                        user.actif
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {user.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => toggleActive(user)}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        user.actif
                          ? 'border-slate-200 text-slate-700 hover:border-red-200 hover:text-red-600'
                          : 'border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:text-emerald-800'
                      }`}
                    >
                      {user.actif ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                      {user.actif ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                    Aucun utilisateur enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Connexions recentes</h2>
            <p className="text-sm text-slate-600">Historique des dernieres connexions et deconnexions.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {recentAuthEvents.length} derniers
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('auth-events')}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                Voir tous les logs
              </button>
            )}
          </div>
        </div>

        {authEventsError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {formatAuthEventsError(authEventsError)}
          </div>
        )}

        {!authEventsError && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Utilisateur</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Action</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Appareil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recentAuthEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                        {getUserLabel(event.user_id)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                          {formatEventLabel(event.event)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        {formatEventDate(event.created_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {event.user_agent ? event.user_agent.slice(0, 60) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {recentAuthEvents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-slate-500">
                        Aucun historique de connexion pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {uniqueAuthEvents.length > recentAuthEvents.length && onNavigate && (
              <div className="mt-3 text-sm text-slate-500">
                Affichage limite aux 10 derniers evenements.
                <button
                  onClick={() => onNavigate('auth-events')}
                  className="ml-2 font-semibold text-amber-600 hover:text-amber-700"
                >
                  Voir tout
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
