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
  Shield,
  BarChart3
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
  budgetYtd: number;
  budgetTotal: number;
  budgetRealiseYtd: number;
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

interface BudgetProduitInsight {
  produit: string;
  territoires: string;
  budgetYtd: number;
  budgetTotal: number;
  actualYtd: number;
  executionPct: number;
  gap: number;
}

interface BudgetConstructeurInsight {
  constructeur: string;
  budgetTotal: number;
  sharePct: number;
}

interface BudgetTerritoireInsight {
  territoire: string;
  budgetYtd: number;
  budgetTotal: number;
  actualYtd: number;
  actualTotal: number;
  executionPct: number;
  gap: number;
}

interface BudgetMargeInsight {
  produit: string;
  margeTotal: number;
  caTotal: number;
  margePct: number;
}

interface BudgetQuantiteInsight {
  produit: string;
  budgetYtd: number;
  budgetTotal: number;
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
    budgetYtd: 0,
    budgetTotal: 0,
    budgetRealiseYtd: 0,
  });
  const [filialePerformance, setFilialePerformance] = useState<FilialePerformance[]>([]);
  const [budgetInsights, setBudgetInsights] = useState<{
    produits: BudgetProduitInsight[];
    constructeurs: BudgetConstructeurInsight[];
    territoires: BudgetTerritoireInsight[];
    marges: BudgetMargeInsight[];
    quantites: BudgetQuantiteInsight[];
  }>({
    produits: [],
    constructeurs: [],
    territoires: [],
    marges: [],
    quantites: [],
  });
  const [budgetYear, setBudgetYear] = useState<number | null>(null);
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
    type BudgetRow = {
      filiale_id: string | null;
      plan_compte: string | null;
      produit?: string | null;
      constructeur?: string | null;
      territoire?: string | null;
      cumul_fin_dec: number | null;
      budget_jan: number | null;
      budget_fev: number | null;
      budget_mar: number | null;
      budget_avr: number | null;
      budget_mai: number | null;
      budget_jui: number | null;
      budget_juil: number | null;
      budget_aou: number | null;
      budget_sep: number | null;
      budget_oct: number | null;
      budget_nov: number | null;
      budget_dec: number | null;
    };

    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const currentYear = today.getFullYear();
    const monthsElapsed = today.getMonth() + 1;
    const horizon90 = new Date(today);
    horizon90.setDate(horizon90.getDate() + 90);
    const filialeFilter = filialeId ? { filiale_id: filialeId } : {};
    const budgetMonthKeys: (keyof BudgetRow)[] = [
      'budget_jan',
      'budget_fev',
      'budget_mar',
      'budget_avr',
      'budget_mai',
      'budget_jui',
      'budget_juil',
      'budget_aou',
      'budget_sep',
      'budget_oct',
      'budget_nov',
      'budget_dec',
    ];

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

    const fetchBudgets = async () => (
      supabase
        .from('budgets')
        .select(
          'filiale_id, plan_compte, produit, constructeur, territoire, cumul_fin_dec, budget_jan, budget_fev, budget_mar, budget_avr, budget_mai, budget_jui, budget_juil, budget_aou, budget_sep, budget_oct, budget_nov, budget_dec'
        )
        .eq('annee', currentYear)
        .match(filialeFilter)
    );

    const [ventesRes, stockRes, kpisRes, actionsRes, oppRes, filialesRes, budgetsRes] = await Promise.all([
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
      fetchBudgets(),
    ]);

    const ventesData = (ventesRes.data ?? []) as VenteStatRow[];
    const stockData = stockRes.data ?? [];
    const kpisPending = kpisRes.data?.length || 0;
    const actionsData = actionsRes.data ?? [];
    const oppData = (oppRes.data ?? []) as OpportuniteRow[];
    const filialesData = filialesRes.data ?? [];
    let budgetsData = (budgetsRes.data ?? []) as BudgetRow[];
    let effectiveBudgetYear = currentYear;

    if (budgetsData.length === 0) {
      const latestYearRes = await supabase
        .from('budgets')
        .select('annee')
        .match(filialeFilter)
        .order('annee', { ascending: false })
        .limit(1);
      const latestYear = latestYearRes.data?.[0]?.annee ?? null;
      if (latestYear && latestYear !== currentYear) {
        const fallbackRes = await supabase
          .from('budgets')
          .select(
            'filiale_id, plan_compte, produit, constructeur, territoire, cumul_fin_dec, budget_jan, budget_fev, budget_mar, budget_avr, budget_mai, budget_jui, budget_juil, budget_aou, budget_sep, budget_oct, budget_nov, budget_dec'
          )
          .eq('annee', latestYear)
          .match(filialeFilter);
        budgetsData = (fallbackRes.data ?? []) as BudgetRow[];
        effectiveBudgetYear = latestYear;
      }
    }

    const budgetMonthLimit = effectiveBudgetYear === currentYear ? monthsElapsed : 12;
    const budgetCutoff =
      effectiveBudgetYear === currentYear
        ? today
        : new Date(effectiveBudgetYear, 11, 31, 23, 59, 59);

    const totalVentes = ventesData.length;
    const montantVentes = ventesData.reduce((sum, v) => sum + (v.ca_ht || 0), 0);
    const stockItems = stockData.length;
    const ventesMonth = ventesData.filter((v) => v.date_vente?.startsWith(currentMonth)).length;

    const normalizeKey = (value: string | null | undefined) =>
      (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    const isChiffreAffaires = (value: string | null | undefined) => normalizeKey(value).includes('chiffre');
    const isMargeBrute = (value: string | null | undefined) => normalizeKey(value).includes('marge');
    const isQuantites = (value: string | null | undefined) => normalizeKey(value).includes('quantite');
    const sumBudgetMonths = (row: BudgetRow, months: number) =>
      budgetMonthKeys.slice(0, months).reduce((sum, key) => sum + (row[key] || 0), 0);

    const caBudgets = budgetsData.filter((row) => isChiffreAffaires(row.plan_compte));
    const margeBudgets = budgetsData.filter((row) => isMargeBrute(row.plan_compte));
    const quantiteBudgets = budgetsData.filter((row) => isQuantites(row.plan_compte));
    const budgetYtd = caBudgets.reduce((sum, row) => sum + sumBudgetMonths(row, budgetMonthLimit), 0);
    const budgetTotal = caBudgets.reduce((sum, row) => {
      const total = row.cumul_fin_dec ?? sumBudgetMonths(row, 12);
      return sum + (total || 0);
    }, 0);
    const budgetRealiseYtd = ventesData.reduce((sum, vente) => {
      if (!vente.date_vente) return sum;
      const date = new Date(vente.date_vente);
      if (Number.isNaN(date.getTime())) return sum;
      if (date.getFullYear() !== effectiveBudgetYear) return sum;
      if (date > budgetCutoff) return sum;
      return sum + (vente.ca_ht || 0);
    }, 0);

    const resolveLabel = (value: string | null | undefined, fallback: string) => {
      const trimmed = (value || '').trim();
      return trimmed ? trimmed : fallback;
    };

    const produitBudgetMap = new Map<string, { budgetYtd: number; budgetTotal: number; actualYtd: number; territoires: Set<string> }>();
    const margeMap = new Map<string, { margeTotal: number; caTotal: number }>();
    const quantiteMap = new Map<string, { budgetYtd: number; budgetTotal: number }>();
    const constructeurMap = new Map<string, number>();
    const territoireBudgetMap = new Map<string, { budgetYtd: number; budgetTotal: number }>();
    const filialeToTerritoire = new Map<string, string>();
    const territoireActualYtdMap = new Map<string, number>();
    const territoireActualTotalMap = new Map<string, number>();
    const constructeurToProduit = new Map<string, string>();

    caBudgets.forEach((row) => {
      const produitLabel = resolveLabel(row.produit, 'Non renseigne');
      const constructeurLabel = resolveLabel(row.constructeur, 'Non renseigne');
      const territoireLabel = resolveLabel(row.territoire, 'Non renseigne');
      const budgetYtdValue = sumBudgetMonths(row, budgetMonthLimit);
      const budgetTotalValue = row.cumul_fin_dec ?? sumBudgetMonths(row, 12);

      if (row.constructeur && row.produit) {
        const key = normalizeKey(row.constructeur);
        if (key && !constructeurToProduit.has(key)) {
          constructeurToProduit.set(key, row.produit);
        }
      }

      const produitEntry = produitBudgetMap.get(produitLabel) || {
        budgetYtd: 0,
        budgetTotal: 0,
        actualYtd: 0,
        territoires: new Set<string>(),
      };
      produitEntry.budgetYtd += budgetYtdValue;
      produitEntry.budgetTotal += budgetTotalValue;
      if (territoireLabel) {
        produitEntry.territoires.add(territoireLabel);
      }
      produitBudgetMap.set(produitLabel, produitEntry);

      const margeEntry = margeMap.get(produitLabel) || { margeTotal: 0, caTotal: 0 };
      margeEntry.caTotal += budgetTotalValue;
      margeMap.set(produitLabel, margeEntry);

      const constructeurTotal = constructeurMap.get(constructeurLabel) || 0;
      constructeurMap.set(constructeurLabel, constructeurTotal + budgetTotalValue);

      const territoireEntry = territoireBudgetMap.get(territoireLabel) || { budgetYtd: 0, budgetTotal: 0 };
      territoireEntry.budgetYtd += budgetYtdValue;
      territoireEntry.budgetTotal += budgetTotalValue;
      territoireBudgetMap.set(territoireLabel, territoireEntry);

      if (row.filiale_id && territoireLabel) {
        const existing = filialeToTerritoire.get(row.filiale_id);
        if (!existing || existing === 'Non renseigne') {
          filialeToTerritoire.set(row.filiale_id, territoireLabel);
        }
      }
    });

    margeBudgets.forEach((row) => {
      const produitLabel = resolveLabel(row.produit, 'Non renseigne');
      const budgetTotalValue = row.cumul_fin_dec ?? sumBudgetMonths(row, 12);
      const margeEntry = margeMap.get(produitLabel) || { margeTotal: 0, caTotal: 0 };
      margeEntry.margeTotal += budgetTotalValue;
      margeMap.set(produitLabel, margeEntry);
    });

    quantiteBudgets.forEach((row) => {
      const produitLabel = resolveLabel(row.produit, 'Non renseigne');
      const budgetYtdValue = sumBudgetMonths(row, budgetMonthLimit);
      const budgetTotalValue = row.cumul_fin_dec ?? sumBudgetMonths(row, 12);
      const quantiteEntry = quantiteMap.get(produitLabel) || { budgetYtd: 0, budgetTotal: 0 };
      quantiteEntry.budgetYtd += budgetYtdValue;
      quantiteEntry.budgetTotal += budgetTotalValue;
      quantiteMap.set(produitLabel, quantiteEntry);
    });

    const actualByProduit = new Map<string, number>();
    ventesData.forEach((vente) => {
      if (!vente.date_vente) return;
      const date = new Date(vente.date_vente);
      if (Number.isNaN(date.getTime())) return;
      if (date.getFullYear() !== effectiveBudgetYear) return;
      if (date > budgetCutoff) return;
      const marqueKey = normalizeKey(vente.marque);
      if (!marqueKey) return;
      const produit = constructeurToProduit.get(marqueKey);
      if (!produit) return;
      const current = actualByProduit.get(produit) || 0;
      actualByProduit.set(produit, current + (vente.ca_ht || 0));
    });

    actualByProduit.forEach((value, produit) => {
      const entry = produitBudgetMap.get(produit);
      if (entry) {
        entry.actualYtd += value;
      }
    });

    ventesData.forEach((vente) => {
      if (!vente.date_vente || !vente.filiale_id) return;
      const date = new Date(vente.date_vente);
      if (Number.isNaN(date.getTime())) return;
      if (date.getFullYear() !== effectiveBudgetYear) return;
      const territoire = filialeToTerritoire.get(vente.filiale_id) || 'Non renseigne';
      const totalValue = territoireActualTotalMap.get(territoire) || 0;
      territoireActualTotalMap.set(territoire, totalValue + (vente.ca_ht || 0));
      if (date > budgetCutoff) return;
      const ytdValue = territoireActualYtdMap.get(territoire) || 0;
      territoireActualYtdMap.set(territoire, ytdValue + (vente.ca_ht || 0));
    });

    const totalCaBudget = Array.from(constructeurMap.values()).reduce((sum, value) => sum + value, 0);

    const formatTerritoires = (items: Set<string>) => {
      const list = Array.from(items).filter(Boolean);
      if (list.length === 0) return 'Non renseigne';
      if (list.length <= 2) return list.join(', ');
      return `${list.slice(0, 2).join(', ')} +${list.length - 2}`;
    };

    const produitInsights = Array.from(produitBudgetMap.entries())
      .map(([produit, values]) => {
        const executionPct = values.budgetYtd > 0 ? (values.actualYtd / values.budgetYtd) * 100 : 0;
        return {
          produit,
          territoires: formatTerritoires(values.territoires),
          budgetYtd: values.budgetYtd,
          budgetTotal: values.budgetTotal,
          actualYtd: values.actualYtd,
          executionPct,
          gap: values.actualYtd - values.budgetYtd,
        };
      })
      .sort((a, b) => b.budgetTotal - a.budgetTotal);

    const constructeurInsights = Array.from(constructeurMap.entries())
      .map(([constructeur, budgetTotal]) => ({
        constructeur,
        budgetTotal,
        sharePct: totalCaBudget > 0 ? (budgetTotal / totalCaBudget) * 100 : 0,
      }))
      .sort((a, b) => b.budgetTotal - a.budgetTotal)
      .slice(0, 5);

    const territoireKeys = new Set<string>([
      ...Array.from(territoireBudgetMap.keys()),
      ...Array.from(territoireActualYtdMap.keys()),
      ...Array.from(territoireActualTotalMap.keys()),
    ]);

    const territoireInsights = Array.from(territoireKeys)
      .map((territoire) => {
        const budgets = territoireBudgetMap.get(territoire) || { budgetYtd: 0, budgetTotal: 0 };
        const actualYtd = territoireActualYtdMap.get(territoire) || 0;
        const actualTotal = territoireActualTotalMap.get(territoire) || 0;
        const executionPct = budgets.budgetYtd > 0 ? (actualYtd / budgets.budgetYtd) * 100 : 0;
        return {
          territoire,
          budgetYtd: budgets.budgetYtd,
          budgetTotal: budgets.budgetTotal,
          actualYtd,
          actualTotal,
          executionPct,
          gap: actualYtd - budgets.budgetYtd,
        };
      })
      .sort((a, b) => b.actualTotal - a.actualTotal)
      .slice(0, 6);

    const margeInsights = Array.from(margeMap.entries())
      .map(([produit, values]) => ({
        produit,
        margeTotal: values.margeTotal,
        caTotal: values.caTotal,
        margePct: values.caTotal > 0 ? (values.margeTotal / values.caTotal) * 100 : 0,
      }))
      .sort((a, b) => b.margePct - a.margePct);

    const quantiteInsights = Array.from(quantiteMap.entries())
      .map(([produit, values]) => ({
        produit,
        budgetYtd: values.budgetYtd,
        budgetTotal: values.budgetTotal,
      }))
      .sort((a, b) => b.budgetTotal - a.budgetTotal);

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
      budgetYtd,
      budgetTotal,
      budgetRealiseYtd,
    });

    setBudgetInsights({
      produits: produitInsights,
      constructeurs: constructeurInsights,
      territoires: territoireInsights,
      marges: margeInsights,
      quantites: quantiteInsights,
    });
    setBudgetYear(effectiveBudgetYear);

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

  const formatEuro = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    return `${Math.round(safeValue).toLocaleString()} EUR`;
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
  const budgetExecutionPct = stats.budgetYtd > 0
    ? Math.round((stats.budgetRealiseYtd / stats.budgetYtd) * 100)
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="Ventes totales"
          value={stats.totalVentes}
          icon={ShoppingCart}
          tone="amber"
          subtitle={`${stats.ventesMonth} ce mois`}
        />

        <StatCard
          title="Chiffre d'affaires"
          value={`${Math.round(stats.montantVentes).toLocaleString()} EUR`}
          icon={DollarSign}
          tone="blue"
        />

        <StatCard
          title="Execution budget YTD"
          value={`${budgetExecutionPct}%`}
          icon={BarChart3}
          tone="purple"
          subtitle={`${formatEuro(stats.budgetRealiseYtd)} / ${formatEuro(stats.budgetYtd)}`}
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

      {budgetInsights.produits.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6 dark:border-slate-800/70">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Budget CA vs realise (YTD)</h2>
                <p className="text-sm text-slate-500">Focus equipement et agriculture</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                Budget annuel {budgetYear ?? new Date().getFullYear()}: {formatEuro(stats.budgetTotal)}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 px-3">Produit</th>
                    <th className="py-2 px-3">Territoire</th>
                    <th className="py-2 px-3">Budget YTD</th>
                    <th className="py-2 px-3">Realise YTD</th>
                    <th className="py-2 px-3">Ecart</th>
                    <th className="py-2 px-3">Execution</th>
                    <th className="py-2 px-3">Budget annuel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budgetInsights.produits.map((row) => {
                    const execution = Math.round(row.executionPct);
                    return (
                      <tr key={row.produit} className="hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <div className="text-sm font-semibold text-slate-900">{row.produit}</div>
                        </td>
                        <td className="py-2 px-3 text-sm text-slate-700">{row.territoires}</td>
                        <td className="py-2 px-3 text-sm text-slate-700">{formatEuro(row.budgetYtd)}</td>
                        <td className="py-2 px-3 text-sm text-slate-700">{formatEuro(row.actualYtd)}</td>
                        <td
                          className={`py-2 px-3 text-sm font-semibold ${
                            row.gap >= 0 ? 'text-emerald-600 dark:text-emerald-200' : 'text-rose-600 dark:text-rose-200'
                          }`}
                        >
                          {formatEuro(row.gap)}
                        </td>
                        <td className="py-2 px-3 text-sm text-slate-700">{execution}%</td>
                        <td className="py-2 px-3 text-sm text-slate-700">{formatEuro(row.budgetTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6 dark:border-slate-800/70">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">CA annuel par territoire</h3>
              {budgetInsights.territoires.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune donnee disponible</p>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const maxAnnual = Math.max(
                      ...budgetInsights.territoires.map((row) => row.actualTotal),
                      1
                    );
                    return budgetInsights.territoires.map((row) => {
                      const widthPct = Math.round((row.actualTotal / maxAnnual) * 100);
                      return (
                        <div key={row.territoire} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                          <div className="flex items-center justify-between text-sm">
                            <p className="font-semibold text-slate-900">{row.territoire}</p>
                            <p className="text-sm text-slate-700">{formatEuro(row.actualTotal)}</p>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                            <span>Budget annuel {formatEuro(row.budgetTotal)}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-200/70 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-500"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                            <span>YTD {formatEuro(row.actualYtd)} / {formatEuro(row.budgetYtd)}</span>
                            <span>{row.executionPct.toFixed(1)}% exec.</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
              {budgetInsights.territoires.length > 0 && (
                <div className="mt-4 rounded-xl border border-slate-100 bg-white/60 p-3">
                  {(() => {
                    const totalActual = budgetInsights.territoires.reduce((sum, row) => sum + row.actualTotal, 0);
                    const totalBudget = budgetInsights.territoires.reduce((sum, row) => sum + row.budgetTotal, 0);
                    return (
                      <>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Total CA annuel {formatEuro(totalActual)}</span>
                          <span>Budget annuel {formatEuro(totalBudget)}</span>
                        </div>
                        <div className="mt-2 h-3 w-full rounded-full bg-slate-200/70 overflow-hidden flex">
                          {budgetInsights.territoires.map((row, index) => {
                            const width = totalActual > 0 ? (row.actualTotal / totalActual) * 100 : 0;
                            const colorClass = [
                              'bg-amber-500',
                              'bg-sky-500',
                              'bg-emerald-500',
                              'bg-indigo-500',
                              'bg-rose-500',
                              'bg-yellow-500',
                            ][index % 6];
                            return (
                              <div
                                key={`${row.territoire}-stack`}
                                className={colorClass}
                                style={{ width: `${width}%` }}
                                title={`${row.territoire}: ${formatEuro(row.actualTotal)}`}
                              />
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6 dark:border-slate-800/70">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Top constructeurs (budget annuel)</h3>
              {budgetInsights.constructeurs.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune donnee disponible</p>
              ) : (
                <div className="space-y-3">
                  {budgetInsights.constructeurs.map((row) => (
                    <div key={row.constructeur} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{row.constructeur}</p>
                        <p className="text-xs text-slate-500">{row.sharePct.toFixed(1)}% du budget</p>
                      </div>
                      <div className="text-sm text-slate-700">{formatEuro(row.budgetTotal)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6 dark:border-slate-800/70">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Marge budgetee</h3>
              {budgetInsights.marges.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune marge budgetee</p>
              ) : (
                <div className="space-y-3">
                  {budgetInsights.marges.slice(0, 4).map((row) => (
                    <div key={row.produit} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{row.produit}</p>
                        <p className="text-xs text-slate-500">{formatEuro(row.margeTotal)} / {formatEuro(row.caTotal)}</p>
                      </div>
                      <div className="text-sm font-semibold text-slate-700">{row.margePct.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-100 p-6 dark:border-slate-800/70">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Quantites budgetees</h3>
              {budgetInsights.quantites.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune quantite budgetee</p>
              ) : (
                <div className="space-y-3">
                  {budgetInsights.quantites.slice(0, 4).map((row) => (
                    <div key={row.produit} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{row.produit}</p>
                        <p className="text-xs text-slate-500">
                          YTD {Math.round(row.budgetYtd).toLocaleString()} / {Math.round(row.budgetTotal).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-sm text-slate-700">{Math.round(row.budgetTotal).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
