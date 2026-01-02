import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFilialeContext } from '../../contexts/FilialeContext';
import { supabase } from '../../lib/supabase';
import {
  Package,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Sparkles,
  ArrowUpRight,
  Shield
} from 'lucide-react';

interface Stats {
  totalVentes: number;
  montantVentes: number;
  stockItems: number;
  stockObsolete: number;
  kpisPending: number;
  ventesMonth: number;
  ventesIncompletes: number;
  actionsRetard: number;
  pipeline90: number;
}

interface FilialePerformance {
  id: string;
  nom: string;
  code: string;
  devise: string;
  ca: number;
  ventesIncompletes: number;
  stockRisque: number;
  pipeline90: number;
  actionsRetard: number;
}

interface DashboardProps {
  onNavigate?: (view: string) => void;
}

const toneStyles = {
  amber: {
    bg: 'from-amber-50 via-white to-white',
    darkBg: 'dark:from-amber-900/30 dark:via-slate-900/80 dark:to-slate-900',
    icon: 'text-amber-600 dark:text-amber-200'
  },
  blue: {
    bg: 'from-sky-50 via-white to-white',
    darkBg: 'dark:from-sky-900/30 dark:via-slate-900/80 dark:to-slate-900',
    icon: 'text-sky-600 dark:text-sky-200'
  },
  gold: {
    bg: 'from-yellow-50 via-white to-white',
    darkBg: 'dark:from-yellow-900/30 dark:via-slate-900/80 dark:to-slate-900',
    icon: 'text-yellow-600 dark:text-yellow-200'
  },
  purple: {
    bg: 'from-indigo-50 via-white to-white',
    darkBg: 'dark:from-indigo-900/30 dark:via-slate-900/80 dark:to-slate-900',
    icon: 'text-indigo-600 dark:text-indigo-200'
  }
};

export function Dashboard({ onNavigate }: DashboardProps) {
  const { profile } = useAuth();
  const { filialeId, isAdmin } = useFilialeContext();
  const [stats, setStats] = useState<Stats>({
    totalVentes: 0,
    montantVentes: 0,
    stockItems: 0,
    stockObsolete: 0,
    kpisPending: 0,
    ventesMonth: 0,
    ventesIncompletes: 0,
    actionsRetard: 0,
    pipeline90: 0,
  });
  const [filialePerformance, setFilialePerformance] = useState<FilialePerformance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!profile) return;

    type VenteStatRow = {
      ca_ht: number | null;
      date_vente: string | null;
      filiale_id: string | null;
      vendeur?: string | null;
      marque?: string | null;
    };
    type OpportuniteRow = {
      id: string;
      filiale_id: string | null;
      date_closing_prevue: string | null;
      statut: string;
      ca_ht_potentiel?: number | null;
    };

    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const horizon90 = new Date(today);
    horizon90.setDate(horizon90.getDate() + 90);
    const filialeFilter = filialeId ? { filiale_id: filialeId } : {};

    const fetchVentes = async () =>
      supabase
        .from('ventes')
        .select('id, ca_ht, date_vente, filiale_id, vendeur, marque')
        .match(filialeFilter);

    const fetchOpportunites = async () => (
      supabase
        .from('opportunites')
        .select('*')
        .match(filialeFilter)
    );

    const [ventesRes, stockRes, kpisRes, actionsRes, oppRes, filialesRes] = await Promise.all([
      fetchVentes(),

      supabase
        .from('stock_items')
        .select('id, date_entree, filiale_id')
        .match(filialeFilter),

      supabase
        .from('kpis_reporting')
        .select('id, filiale_id')
        .in('status', ['Draft', 'Submitted'])
        .match(filialeFilter),

      supabase
        .from('plan_actions')
        .select('id, filiale_id, statut, date_fin_prevue')
        .match(filialeFilter),
      fetchOpportunites(),
      supabase
        .from('filiales')
        .select('id, nom, code, devise')
        .match(filialeFilter),
    ]);

    const ventesData = (ventesRes.data ?? []) as VenteStatRow[];
    const stockData = stockRes.data ?? [];
    const kpisPending = kpisRes.data?.length || 0;
    const actionsData = actionsRes.data ?? [];
    const oppData = (oppRes.data ?? []) as OpportuniteRow[];
    const filialesData = filialesRes.data ?? [];

    const totalVentes = ventesData.length;
    const montantVentes = ventesData.reduce((sum, v) => sum + (v.ca_ht || 0), 0);
    const stockItems = stockData.length;
    const ventesMonth = ventesData.filter((v) => v.date_vente?.startsWith(currentMonth)).length;

    const stockObsolete = stockData.filter(item => {
      const monthsOld = Math.floor(
        (Date.now() - new Date(item.date_entree).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      return monthsOld > 12;
    }).length;

    const performance = new Map<string, FilialePerformance>();
    filialesData.forEach((filiale) => {
      performance.set(filiale.id, {
        id: filiale.id,
        nom: filiale.nom,
        code: filiale.code,
        devise: filiale.devise || 'XAF',
        ca: 0,
        ventesIncompletes: 0,
        stockRisque: 0,
        pipeline90: 0,
        actionsRetard: 0,
      });
    });

    const ensurePerformance = (filialeId: string | null) => {
      if (!filialeId) return null;
      if (!performance.has(filialeId)) {
        performance.set(filialeId, {
          id: filialeId,
          nom: filialeId,
          code: '',
          devise: 'XAF',
          ca: 0,
          ventesIncompletes: 0,
          stockRisque: 0,
          pipeline90: 0,
          actionsRetard: 0,
        });
      }
      return performance.get(filialeId) || null;
    };

    let ventesIncompletes = 0;
    ventesData.forEach((vente) => {
      const perf = ensurePerformance(vente.filiale_id || null);
      const ca = vente.ca_ht || 0;
      const isIncomplete = !vente.vendeur || !vente.marque || !vente.ca_ht;
      if (isIncomplete) {
        ventesIncompletes += 1;
      }
      if (perf) {
        perf.ca += Number(ca) || 0;
        if (isIncomplete) perf.ventesIncompletes += 1;
      }
    });

    stockData.forEach((item) => {
      const perf = ensurePerformance(item.filiale_id || null);
      if (!perf) return;
      const monthsOld = Math.floor(
        (Date.now() - new Date(item.date_entree).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      if (monthsOld > 12) {
        perf.stockRisque += 1;
      }
    });

    const pipelineStatuses = new Set(['En_cours', 'Reporte']);
    let pipeline90 = 0;
    oppData.forEach((opp) => {
      if (!opp.date_closing_prevue || !pipelineStatuses.has(opp.statut)) {
        return;
      }
      const closingDate = new Date(opp.date_closing_prevue);
      if (closingDate < today || closingDate > horizon90) return;
      const value = Number(opp.ca_ht_potentiel || 0);
      pipeline90 += value;
      const perf = ensurePerformance(opp.filiale_id || null);
      if (perf) perf.pipeline90 += value;
    });

    const isOverdueAction = (action: { statut: string | null; date_fin_prevue: string | null }) => {
      if (action.statut === 'Termine' || action.statut === 'Annule') return false;
      if (action.statut === 'Retard') return true;
      if (!action.date_fin_prevue) return false;
      return new Date(action.date_fin_prevue) < today;
    };

    let actionsRetard = 0;
    actionsData.forEach((action) => {
      if (!isOverdueAction(action)) return;
      actionsRetard += 1;
      const perf = ensurePerformance(action.filiale_id || null);
      if (perf) perf.actionsRetard += 1;
    });

    const performanceRows = Array.from(performance.values()).sort((a, b) => b.ca - a.ca);

    setStats({
      totalVentes,
      montantVentes,
      stockItems,
      stockObsolete,
      kpisPending,
      ventesMonth,
      ventesIncompletes,
      actionsRetard,
      pipeline90,
    });

    setFilialePerformance(performanceRows);

    setLoading(false);
  }, [filialeId, profile]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const StatCard = ({
  title,
  value,
  icon: Icon,
  tone,
  subtitle
}: {
  title: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
    tone: keyof typeof toneStyles;
    subtitle?: string;
  }) => {
    const toneStyle = toneStyles[tone];
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-900/5 dark:border-slate-800/70 dark:bg-slate-900/70">
        <div className={`absolute inset-0 bg-gradient-to-br ${toneStyle.bg} ${toneStyle.darkBg} opacity-80`} />
        <div className="relative p-6 flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="p-3 rounded-xl bg-white/80 shadow-inner dark:bg-slate-900/60 dark:border dark:border-slate-800/60">
            <Icon className={`w-6 h-6 ${toneStyle.icon}`} />
          </div>
        </div>
      </div>
    );
  };

  const formatAmount = (value: number, devise: string) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    return `${Math.round(safeValue).toLocaleString()} ${devise}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="relative">
          <div className="h-14 w-14 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
          <div className="absolute inset-1 rounded-full bg-amber-500/20 blur-xl" />
        </div>
      </div>
    );
  }

  const obsoleteRate = stats.stockItems > 0
    ? Math.round((stats.stockObsolete / stats.stockItems) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white shadow-2xl">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-amber-500/10 via-transparent to-transparent" />
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-amber-500/30 blur-2xl" />
        <div className="absolute bottom-[-3rem] right-[-3rem] h-56 w-56 rounded-full bg-yellow-400/20 blur-3xl" />

        <div className="relative p-6 lg:p-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                <Sparkles className="w-4 h-4" />
                Pilotage en direct
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
                Tableau de bord
              </h1>
              <p className="text-slate-200">
                Vue d'ensemble de votre activité
                {profile?.role !== 'admin_siege' && ' - Filiale'}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-amber-100/80">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 border border-white/10">
                  <Clock className="w-4 h-4" />
                  Dernière synchro en temps réel
                </div>
                {profile?.role && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 border border-white/10">
                    <Shield className="w-4 h-4" />
                    Rôle: {profile.role}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 min-w-[260px]">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg">
                <p className="text-sm text-amber-100/80">Ventes ce mois</p>
                <p className="text-2xl font-semibold">{stats.ventesMonth}</p>
                <span className="mt-2 inline-flex items-center text-xs text-amber-100">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  Priorité commerciale
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg">
                <p className="text-sm text-amber-100/80">KPIs à valider</p>
                <p className="text-2xl font-semibold">{stats.kpisPending}</p>
                <span className="mt-2 inline-flex items-center text-xs text-amber-100">
                  <Clock className="w-4 h-4 mr-1" />
                  Suivi en attente
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ventes totales"
          value={stats.totalVentes}
          icon={ShoppingCart}
          tone="amber"
          subtitle={`${stats.ventesMonth} ce mois`}
        />

        <StatCard
          title="Chiffre d'affaires"
          value={`${Math.round(stats.montantVentes).toLocaleString()} XAF`}
          icon={DollarSign}
          tone="blue"
        />

        <StatCard
          title="Articles en stock"
          value={stats.stockItems}
          icon={Package}
          tone="gold"
          subtitle={stats.stockObsolete > 0 ? `${stats.stockObsolete} obsolètes` : 'Stock sain'}
        />

        <StatCard
          title="KPIs en attente"
          value={stats.kpisPending}
          icon={Clock}
          tone="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6 dark:border-slate-800/70">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-200" />
            Actions rapides
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: 'Nouvelle vente', desc: 'Enregistrer une vente', tone: 'from-amber-500 to-yellow-600', view: 'ventes' },
              { title: 'Saisir un KPI', desc: 'Reporting en temps réel', tone: 'from-indigo-500 to-sky-600', view: 'kpis' },
              { title: 'Gérer le stock', desc: 'Mouvements et alertes', tone: 'from-amber-500 to-orange-600', view: 'stocks' },
              { title: 'Plan actions', desc: 'Actions correctives', tone: 'from-sky-500 to-indigo-600', view: 'plan-actions' },
            ].map((action) => (
              <button
                key={action.title}
                onClick={() => onNavigate?.(action.view)}
                className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:-translate-y-0.5 transition shadow-sm hover:shadow-md"
              >
                <span className={`inline-flex items-center rounded-full bg-gradient-to-r ${action.tone} text-white text-xs font-semibold px-3 py-1 mb-3`}>
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  Accès direct
                </span>
                <p className="font-semibold text-slate-900">{action.title}</p>
                <p className="text-sm text-slate-600">{action.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6 dark:border-slate-800/70">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-200" />
            Priorités opérations
          </h2>
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex items-start gap-3 dark:bg-amber-900/25 dark:border-amber-700/60">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-200 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">Stock à risque</p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {stats.stockObsolete} article(s) en stock depuis plus de 12 mois
                </p>
              </div>
            </div>
            {stats.kpisPending > 0 && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 flex items-start gap-3 dark:bg-sky-900/25 dark:border-sky-700/60">
                <Clock className="w-5 h-5 text-sky-600 dark:text-sky-200 mt-0.5" />
                <div>
                  <p className="font-semibold text-sky-900 dark:text-sky-100">KPIs en attente</p>
                  <p className="text-sm text-sky-800 dark:text-sky-200">
                    {stats.kpisPending} KPI(s) nécessitent une validation
                  </p>
                </div>
              </div>
            )}
            {stats.ventesIncompletes > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 flex items-start gap-3 dark:bg-rose-900/25 dark:border-rose-700/60">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-200 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-900 dark:text-rose-100">Ventes incompletes</p>
                  <p className="text-sm text-rose-800 dark:text-rose-200">
                    {stats.ventesIncompletes} vente(s) sans vendeur ou marque
                  </p>
                </div>
              </div>
            )}
            {stats.actionsRetard > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex items-start gap-3 dark:bg-amber-900/25 dark:border-amber-700/60">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-200 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-100">Actions en retard</p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {stats.actionsRetard} action(s) depassees
                  </p>
                </div>
              </div>
            )}
            {stats.pipeline90 > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 flex items-start gap-3 dark:bg-emerald-900/25 dark:border-emerald-700/60">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-200 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-100">Pipeline 90 jours</p>
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    {Math.round(stats.pipeline90).toLocaleString()} CA potentiel
                  </p>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex items-start gap-3 dark:bg-amber-900/25 dark:border-amber-700/60">
              <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-200 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">Performance ventes</p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {stats.ventesMonth} ventes facturées ce mois
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {filialePerformance.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6 dark:border-slate-800/70">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Performance filiale</h2>
            {isAdmin && (
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Vue groupe</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 px-3">Filiale</th>
                  <th className="py-2 px-3">CA</th>
                  <th className="py-2 px-3">Ventes incompletes</th>
                  <th className="py-2 px-3">Pipeline 90j</th>
                  <th className="py-2 px-3">Stock risque</th>
                  <th className="py-2 px-3">Actions retard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filialePerformance.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <div className="text-sm font-semibold text-slate-900">{row.nom}</div>
                      {row.code && <div className="text-xs text-slate-500">{row.code}</div>}
                    </td>
                    <td className="py-2 px-3 text-sm text-slate-700">{formatAmount(row.ca, row.devise)}</td>
                    <td className={`py-2 px-3 text-sm ${row.ventesIncompletes > 0 ? "text-rose-600 dark:text-rose-200" : "text-emerald-600 dark:text-emerald-200"}`}>
                      {row.ventesIncompletes}
                    </td>
                    <td className="py-2 px-3 text-sm text-slate-700">{formatAmount(row.pipeline90, row.devise)}</td>
                    <td className={`py-2 px-3 text-sm ${row.stockRisque > 0 ? "text-amber-700 font-semibold" : "text-slate-600"}`}>
                      {row.stockRisque}
                    </td>
                    <td className={`py-2 px-3 text-sm ${row.actionsRetard > 0 ? "text-amber-700 font-semibold" : "text-slate-600"}`}>
                      {row.actionsRetard}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6 dark:border-slate-800/70">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-200" />
          État opérationnel
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-slate-600">Stock sain</p>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-500"
                style={{ width: `${Math.min(100 - obsoleteRate, 100)}%` }}
              />
            </div>
            <p className="text-sm text-slate-600 mt-1">
              {stats.stockItems - stats.stockObsolete} articles sur {stats.stockItems} sans alerte
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-600">Obsolescence</p>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                style={{ width: `${obsoleteRate}%` }}
              />
            </div>
            <p className="text-sm text-slate-600 mt-1">
              {obsoleteRate}% des articles à traiter
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-600">Temps réel KPIs</p>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
                style={{ width: `${Math.min(stats.kpisPending, 8) * 12.5}%` }}
              />
            </div>
            <p className="text-sm text-slate-600 mt-1">
              {stats.kpisPending} éléments en cours de validation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
