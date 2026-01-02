import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type UserProfile = Pick<
  Database['public']['Tables']['users_profiles']['Row'],
  'id' | 'prenom' | 'nom' | 'email' | 'filiale_id'
>;
type Filiale = Pick<Database['public']['Tables']['filiales']['Row'], 'id' | 'nom' | 'code'>;

type DatasetConfig = {
  id: string;
  label: string;
  table: string;
  dateField: string;
  supportsFiliale: boolean;
  supportsUser: boolean;
  userField?: string;
};

const DATASETS: DatasetConfig[] = [
  { id: 'ventes', label: 'Ventes', table: 'ventes', dateField: 'created_at', supportsFiliale: true, supportsUser: true },
  { id: 'stocks', label: 'Stocks', table: 'stock_items', dateField: 'created_at', supportsFiliale: true, supportsUser: true },
  {
    id: 'commandes-clients',
    label: 'Commandes clients',
    table: 'commandes_clients',
    dateField: 'created_at',
    supportsFiliale: true,
    supportsUser: true,
    userField: 'created_by_id',
  },
  {
    id: 'commandes-fournisseurs',
    label: 'Commandes fournisseurs',
    table: 'commandes_fournisseurs',
    dateField: 'created_at',
    supportsFiliale: true,
    supportsUser: true,
  },
  {
    id: 'visites-clients',
    label: 'Visites clients',
    table: 'visites_clients',
    dateField: 'created_at',
    supportsFiliale: true,
    supportsUser: true,
  },
  { id: 'opportunites', label: 'Opportunites', table: 'opportunites', dateField: 'created_at', supportsFiliale: true, supportsUser: true },
  {
    id: 'ventes-perdues',
    label: 'Ventes perdues',
    table: 'ventes_perdues',
    dateField: 'created_at',
    supportsFiliale: true,
    supportsUser: true,
  },
  { id: 'budgets', label: 'Budgets', table: 'budgets', dateField: 'created_at', supportsFiliale: true, supportsUser: true },
  {
    id: 'plan-actions',
    label: 'Plan d\'actions',
    table: 'plan_actions',
    dateField: 'created_at',
    supportsFiliale: true,
    supportsUser: true,
  },
  { id: 'pdm', label: 'Part de marche (PDM)', table: 'pdm_entries', dateField: 'created_at', supportsFiliale: true, supportsUser: true },
  {
    id: 'auth-events',
    label: 'Journal des connexions',
    table: 'auth_events',
    dateField: 'created_at',
    supportsFiliale: false,
    supportsUser: true,
    userField: 'user_id',
  },
  { id: 'utilisateurs', label: 'Utilisateurs', table: 'users_profiles', dateField: 'created_at', supportsFiliale: true, supportsUser: false },
  { id: 'filiales', label: 'Filiales', table: 'filiales', dateField: 'created_at', supportsFiliale: false, supportsUser: false },
];

const EXPORT_PAGE_SIZE = 500;

export function DataExportsView() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [datasetId, setDatasetId] = useState('ventes');
  const [selectedFilialeId, setSelectedFilialeId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState<'csv' | 'pdf' | ''>('');
  const [error, setError] = useState('');

  const isAdmin = profile?.role === 'admin_siege';
  const dataset = useMemo(() => DATASETS.find((item) => item.id === datasetId) || DATASETS[0], [datasetId]);

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

  const userIdsByFiliale = useMemo(() => {
    return users.reduce<Record<string, string[]>>((acc, user) => {
      if (!user.filiale_id) return acc;
      if (!acc[user.filiale_id]) acc[user.filiale_id] = [];
      acc[user.filiale_id].push(user.id);
      return acc;
    }, {});
  }, [users]);

  const availableUsers = useMemo(() => {
    if (!selectedFilialeId) return users;
    return users.filter((user) => user.filiale_id === selectedFilialeId);
  }, [selectedFilialeId, users]);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const [{ data: usersData }, { data: filialesData }] = await Promise.all([
        supabase.from('users_profiles').select('id, prenom, nom, email, filiale_id').order('created_at', { ascending: false }).limit(500),
        supabase.from('filiales').select('id, nom, code').order('nom'),
      ]);
      if (usersData) setUsers(usersData as UserProfile[]);
      if (filialesData) setFiliales(filialesData as Filiale[]);
    };
    load();
  }, [isAdmin]);

  useEffect(() => {
    setSelectedUserId('');
    setError('');
  }, [datasetId]);

  const buildQuery = (nextPage: number) => {
    if (!dataset) return null;
    const from = nextPage * EXPORT_PAGE_SIZE;
    const to = from + EXPORT_PAGE_SIZE - 1;
    let query = supabase.from(dataset.table).select('*').order(dataset.dateField, { ascending: false }).range(from, to);

    if (dataset.supportsFiliale && selectedFilialeId) {
      if (dataset.id === 'auth-events') {
        const ids = userIdsByFiliale[selectedFilialeId] || [];
        if (ids.length === 0) return null;
        query = query.in('user_id', ids);
      } else {
        query = query.eq('filiale_id', selectedFilialeId);
      }
    }

    if (dataset.supportsUser && selectedUserId) {
      const field = dataset.userField || 'created_by';
      query = query.eq(field, selectedUserId);
    }

    if (dateFrom) {
      query = query.gte(dataset.dateField, `${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      query = query.lte(dataset.dateField, `${dateTo}T23:59:59`);
    }

    return query;
  };

  const fetchAllRows = async () => {
    const rows: Record<string, unknown>[] = [];
    let currentPage = 0;
    while (true) {
      const query = buildQuery(currentPage);
      if (!query) break;
      const { data, error: fetchError } = await query;
      if (fetchError) {
        throw fetchError;
      }
      const batch = (data as Record<string, unknown>[]) || [];
      rows.push(...batch);
      if (batch.length < EXPORT_PAGE_SIZE) break;
      currentPage += 1;
    }
    return rows;
  };

  const decorateRows = (rows: Record<string, unknown>[]) => {
    return rows.map((row) => {
      const decorated = { ...row } as Record<string, unknown>;
      if (dataset.supportsUser) {
        const field = dataset.userField || 'created_by';
        const userId = String(decorated[field] || '');
        if (userId) decorated.user_label = userMap[userId] || userId;
      }
      if (dataset.supportsFiliale) {
        const filialeId = String(decorated.filiale_id || '');
        if (filialeId) decorated.filiale_label = filialeMap[filialeId] || filialeId;
      }
      if (dataset.id === 'auth-events') {
        const userId = String(decorated.user_id || '');
        if (userId) {
          const filialeId = users.find((user) => user.id === userId)?.filiale_id || '';
          if (filialeId) decorated.filiale_label = filialeMap[filialeId] || filialeId;
          decorated.user_label = userMap[userId] || userId;
        }
      }
      return decorated;
    });
  };

  const exportCsv = async () => {
    setExporting('csv');
    setError('');
    try {
      const rows = decorateRows(await fetchAllRows());
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      const lines = [
        columns.join(','),
        ...rows.map((row) =>
          columns.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(',')
        ),
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export_${dataset.id}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export CSV impossible.';
      setError(message);
    } finally {
      setExporting('');
    }
  };

  const exportPdf = async () => {
    setExporting('pdf');
    setError('');
    try {
      const rows = decorateRows(await fetchAllRows());
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      const filters = [
        selectedFilialeId ? `Filiale: ${filialeMap[selectedFilialeId] || selectedFilialeId}` : 'Filiale: Toutes',
        selectedUserId ? `Utilisateur: ${userMap[selectedUserId] || selectedUserId}` : 'Utilisateur: Tous',
        dateFrom ? `Du: ${dateFrom}` : null,
        dateTo ? `Au: ${dateTo}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const headerCells = columns.map((col) => `<th>${col}</th>`).join('');
      const bodyRows = rows
        .map((row) => {
          const cells = columns.map((col) => `<td>${String(row[col] ?? '')}</td>`).join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');

      const html = `
        <html>
          <head>
            <title>Export ${dataset.label}</title>
            <style>
              body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
              h1 { font-size: 20px; margin: 0 0 8px; }
              p { margin: 0 0 16px; color: #4b5563; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; }
              th, td { border: 1px solid #e5e7eb; padding: 6px; text-align: left; vertical-align: top; }
              th { background: #f9fafb; }
            </style>
          </head>
          <body>
            <h1>Export ${dataset.label}</h1>
            <p>${filters}</p>
            <table>
              <thead><tr>${headerCells}</tr></thead>
              <tbody>${bodyRows || `<tr><td colspan="${columns.length}">Aucune donnee</td></tr>`}</tbody>
            </table>
          </body>
        </html>
      `;
      const printWindow = window.open('', '_blank', 'width=1000,height=700');
      if (!printWindow) return;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export PDF impossible.';
      setError(message);
    } finally {
      setExporting('');
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-700">Acces reserve a l'administrateur general.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Exports</h1>
          <p className="text-slate-600">Exporter les donnees par utilisateur, filiale et periode.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={exporting !== ''}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
          >
            {exporting === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
          <button
            onClick={exportPdf}
            disabled={exporting !== ''}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-slate-700">Jeu de donnees</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
            >
              {DATASETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {dataset.supportsFiliale && (
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

          {dataset.supportsUser && (
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
          )}

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
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Le filtrage utilisateur utilise le champ {dataset.userField || 'created_by'} quand disponible.
        </p>
      </div>
    </div>
  );
}
