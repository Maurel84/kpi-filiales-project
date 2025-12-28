import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type AuthEvent = Database['public']['Tables']['auth_events']['Row'];
type UserProfile = Pick<
  Database['public']['Tables']['users_profiles']['Row'],
  'id' | 'prenom' | 'nom' | 'email' | 'filiale_id'
>;
type Filiale = Pick<Database['public']['Tables']['filiales']['Row'], 'id' | 'nom' | 'code'>;

const PAGE_SIZE = 50;
const EXPORT_PAGE_SIZE = 500;

export function AuthEventsView() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedFilialeId, setSelectedFilialeId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState<'csv' | 'pdf' | ''>('');

  const isAdmin = profile?.role === 'admin_siege';
  const canViewLogs = profile?.role === 'admin_siege' || profile?.role === 'manager_filiale';

  const userMap = useMemo(() => {
    return users.reduce<Record<string, string>>((acc, user) => {
      const name = [user.prenom, user.nom].filter(Boolean).join(' ').trim();
      acc[user.id] = name || user.email || user.id;
      return acc;
    }, {});
  }, [users]);

  const filialeMap = useMemo(() => {
    return filiales.reduce<Record<string, string>>((acc, filiale) => {
      acc[filiale.id] = filiale.nom || filiale.code || filiale.id;
      return acc;
    }, {});
  }, [filiales]);

  const effectiveFilialeId = isAdmin ? selectedFilialeId : profile?.filiale_id || '';

  const availableUsers = useMemo(() => {
    if (!effectiveFilialeId) return users;
    return users.filter((user) => user.filiale_id === effectiveFilialeId);
  }, [effectiveFilialeId, users]);

  const availableUserIds = useMemo(() => {
    if (!effectiveFilialeId) return [];
    return users.filter((user) => user.filiale_id === effectiveFilialeId).map((user) => user.id);
  }, [effectiveFilialeId, users]);

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

  const formatEventLabel = (event: AuthEvent['event']) => {
    return event === 'signed_in' ? 'Connexion' : 'Deconnexion';
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

  const buildQuery = (nextPage: number) => {
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from('auth_events')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (selectedUserId) {
      query = query.eq('user_id', selectedUserId);
    } else if (effectiveFilialeId) {
      if (availableUserIds.length === 0) {
        return null;
      }
      query = query.in('user_id', availableUserIds);
    }

    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`);
    }

    return query;
  };

  const loadPage = async (nextPage: number, append: boolean) => {
    const query = buildQuery(nextPage);
    if (!query) {
      setAuthEvents([]);
      setHasMore(false);
      setPage(0);
      return true;
    }

    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      return false;
    }

    if (data) {
      setAuthEvents((prev) => (append ? [...prev, ...(data as AuthEvent[])] : (data as AuthEvent[])));
      setHasMore(data.length === PAGE_SIZE);
      setPage(nextPage);
    }
    return true;
  };

  useEffect(() => {
    const load = async () => {
      if (!canViewLogs) {
        setLoading(false);
        return;
      }

      const usersQuery = supabase
        .from('users_profiles')
        .select('id, prenom, nom, email, filiale_id')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!isAdmin && profile?.filiale_id) {
        usersQuery.eq('filiale_id', profile.filiale_id);
      }

      const [{ data: usersData }, { data: filialesData }] = await Promise.all([
        usersQuery,
        isAdmin ? supabase.from('filiales').select('id, nom, code').order('nom') : Promise.resolve({ data: [] }),
      ]);

      if (usersData) {
        setUsers(usersData as UserProfile[]);
      }
      if (filialesData) {
        setFiliales(filialesData as Filiale[]);
      }

      if (!isAdmin && profile?.filiale_id) {
        setSelectedFilialeId(profile.filiale_id);
      }

      const ok = await loadPage(0, false);
      if (!ok) {
        setLoading(false);
        return;
      }
      setLoading(false);
    };
    load();
  }, [canViewLogs, isAdmin, profile?.filiale_id]);

  useEffect(() => {
    if (!canViewLogs) return;
    loadPage(0, false);
  }, [selectedUserId, effectiveFilialeId, dateFrom, dateTo, availableUserIds.length]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadPage(page + 1, true);
    setLoadingMore(false);
  };

  const buildExportQuery = (nextPage: number) => {
    const from = nextPage * EXPORT_PAGE_SIZE;
    const to = from + EXPORT_PAGE_SIZE - 1;
    let query = supabase
      .from('auth_events')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (selectedUserId) {
      query = query.eq('user_id', selectedUserId);
    } else if (effectiveFilialeId && availableUserIds.length > 0) {
      query = query.in('user_id', availableUserIds);
    }

    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`);
    }

    return query;
  };

  const fetchAllForExport = async () => {
    const allRows: AuthEvent[] = [];
    let currentPage = 0;
    while (true) {
      const query = buildExportQuery(currentPage);
      if (!query) break;
      const { data, error: fetchError } = await query;
      if (fetchError) {
        throw fetchError;
      }
      const rows = (data as AuthEvent[]) || [];
      allRows.push(...rows);
      if (rows.length < EXPORT_PAGE_SIZE) {
        break;
      }
      currentPage += 1;
    }
    return allRows;
  };

  const exportCsv = async () => {
    if (!isAdmin) return;
    setExporting('csv');
    try {
      const rows = await fetchAllForExport();
      const headers = ['utilisateur', 'action', 'date', 'user_id', 'ip_address', 'user_agent'];
      const lines = [
        headers.join(','),
        ...rows.map((row) => {
          const values = [
            userMap[row.user_id] || 'Utilisateur inconnu',
            formatEventLabel(row.event),
            row.created_at,
            row.user_id,
            row.ip_address || '',
            row.user_agent || '',
          ];
          return values.map((value) => `"${String(value).replace(/\"/g, '""')}"`).join(',');
        }),
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `journal_connexions_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting('');
    }
  };

  const exportPdf = async () => {
    if (!isAdmin) return;
    setExporting('pdf');
    try {
      const rows = await fetchAllForExport();
      const title = 'Journal des connexions';
      const filters = [
        selectedUserId ? `Utilisateur: ${userMap[selectedUserId] || selectedUserId}` : 'Utilisateur: Tous',
        effectiveFilialeId ? `Filiale: ${filialeMap[effectiveFilialeId] || effectiveFilialeId}` : 'Filiale: Toutes',
        dateFrom ? `Du: ${dateFrom}` : null,
        dateTo ? `Au: ${dateTo}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const rowsHtml = rows
        .map(
          (row) => `
          <tr>
            <td>${userMap[row.user_id] || 'Utilisateur inconnu'}</td>
            <td>${formatEventLabel(row.event)}</td>
            <td>${formatEventDate(row.created_at)}</td>
            <td>${row.ip_address || '-'}</td>
            <td>${row.user_agent || '-'}</td>
          </tr>
        `
        )
        .join('');

      const html = `
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
              h1 { font-size: 20px; margin: 0 0 8px; }
              p { margin: 0 0 16px; color: #4b5563; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
              th { background: #f9fafb; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <p>${filters}</p>
            <table>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Date</th>
                  <th>IP</th>
                  <th>Appareil</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="5">Aucune donnee</td></tr>'}
              </tbody>
            </table>
          </body>
        </html>
      `;
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) return;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } finally {
      setExporting('');
    }
  };

  const resetFilters = () => {
    setSelectedUserId('');
    setDateFrom('');
    setDateTo('');
    if (isAdmin) {
      setSelectedFilialeId('');
    }
  };

  if (!canViewLogs) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-700">Acces reserve aux managers filiale et administrateurs.</p>
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Journal des connexions</h1>
          <p className="text-slate-600">Toutes les connexions et deconnexions enregistrees.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {uniqueAuthEvents.length} evenements charges
          </div>
          {isAdmin && (
            <>
              <button
                onClick={exportCsv}
                disabled={exporting !== ''}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 border border-emerald-200 rounded-full px-3 py-1"
              >
                Export CSV
              </button>
              <button
                onClick={exportPdf}
                disabled={exporting !== ''}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-full px-3 py-1"
              >
                Export PDF
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {formatAuthEventsError(error)}
        </div>
      )}

      {!error && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            {isAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Filiale</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={selectedFilialeId}
                  onChange={(e) => setSelectedFilialeId(e.target.value)}
                >
                  <option value="">Toutes</option>
                  {filiales.map((filiale) => (
                    <option key={filiale.id} value={filiale.id}>
                      {filiale.nom || filiale.code || filiale.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Utilisateur</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Tous</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {[user.prenom, user.nom].filter(Boolean).join(' ') || user.email || user.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date debut</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date fin</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
              >
                Reinitialiser
              </button>
            </div>
          </div>

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
                {uniqueAuthEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                      {userMap[event.user_id] || 'Utilisateur inconnu'}
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
                      {event.user_agent ? event.user_agent.slice(0, 80) : 'N/A'}
                    </td>
                  </tr>
                ))}
                {uniqueAuthEvents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-slate-500">
                      Aucun historique de connexion pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Charger plus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
