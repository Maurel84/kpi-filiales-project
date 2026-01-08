import { useEffect, useMemo, useState } from 'react';
import { Plus, X, PiggyBank, Download, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useFilialeContext } from '../../contexts/FilialeContext';
import type { Database } from '../../lib/database.types';
import { ModalTabs } from '../ui/ModalTabs';

type Budget = Database['public']['Tables']['budgets']['Row'];
type BudgetInsert = Database['public']['Tables']['budgets']['Insert'];
type VenteRow = Pick<
  Database['public']['Tables']['ventes']['Row'],
  'ca_ht' | 'date_vente' | 'filiale_id' | 'marque'
>;

type BudgetAnalysisRow = {
  id: string;
  filiale_id: string | null;
  filiale_label: string;
  produit: string | null;
  plan_compte: string | null;
  constructeur: string | null;
  budget_ytd: number;
  budget_total: number;
  actual_ytd: number | null;
  variance: number | null;
  variance_pct: number | null;
  eac: number | null;
  eac_variance: number | null;
  plan_type: 'ca' | 'marge' | 'qty';
};

const monthFields = [
  { key: 'budget_jan', label: 'Jan' },
  { key: 'budget_fev', label: 'Fev' },
  { key: 'budget_mar', label: 'Mar' },
  { key: 'budget_avr', label: 'Avr' },
  { key: 'budget_mai', label: 'Mai' },
  { key: 'budget_jui', label: 'Jui' },
  { key: 'budget_juil', label: 'Juil' },
  { key: 'budget_aou', label: 'Aou' },
  { key: 'budget_sep', label: 'Sep' },
  { key: 'budget_oct', label: 'Oct' },
  { key: 'budget_nov', label: 'Nov' },
  { key: 'budget_dec', label: 'Dec' },
] as const;

type MonthKey = (typeof monthFields)[number]['key'];

const territoireOptions = [
  'Cameroun',
  'Congo',
  'Gabon',
  'Maroc',
  'Offshore (EXPORT)',
  'RDC',
  'Rwanda',
  'Tchad',
  'Total Territoire',
] as const;

export function BudgetsView() {
  const { profile } = useAuth();
  const { filialeId, isAdmin, filiales } = useFilialeContext();
  const territoireListId = 'budgets-territoires';
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [ventes, setVentes] = useState<VenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisYear, setAnalysisYear] = useState<number>(new Date().getFullYear());
  const [analysisPlan, setAnalysisPlan] = useState<string>("Chiffre d'affaires");
  const [analysisConstructeur, setAnalysisConstructeur] = useState('');
  const [analysisProduit, setAnalysisProduit] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'infos' | 'mensuel'>('infos');
  const showAllTabs = true;
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    annee: new Date().getFullYear(),
    territoire: '',
    produit: '',
    produit_autre: '',
    plan_compte: '',
    plan_compte_autre: '',
    constructeur: '',
    constructeur_autre: '',
    plan_n1: '',
    plan_n2: '',
  });
  const monthValuesInitial = useMemo(
    () =>
      Object.fromEntries(monthFields.map((m) => [m.key, 0])) as Record<MonthKey, number>,
    []
  );
  const [monthValues, setMonthValues] = useState<Record<MonthKey, number>>(monthValuesInitial);
  const filialeMap = useMemo(
    () => new Map(filiales.map((filiale) => [filiale.id, filiale.nom || filiale.code || filiale.id])),
    [filiales]
  );
  const availableYears = useMemo(() => {
    const unique = Array.from(new Set(budgets.map((row) => row.annee))).sort((a, b) => b - a);
    if (unique.length === 0) {
      return [new Date().getFullYear()];
    }
    return unique;
  }, [budgets]);
  const availablePlans = useMemo(() => {
    const unique = Array.from(new Set(budgets.map((row) => row.plan_compte).filter(Boolean))) as string[];
    return unique.sort();
  }, [budgets]);
  const availableConstructeurs = useMemo(() => {
    const unique = Array.from(
      new Set(budgets.map((row) => row.constructeur).filter(Boolean))
    ) as string[];
    return unique.sort();
  }, [budgets]);
  const availableProduits = useMemo(() => {
    const unique = Array.from(new Set(budgets.map((row) => row.produit).filter(Boolean))) as string[];
    return unique.sort();
  }, [budgets]);

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .order('annee', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error && data) setBudgets(data as Budget[]);
      setLoading(false);
    };
    load();
  }, [profile]);

  useEffect(() => {
    if (isModalOpen) {
      setActiveTab('infos');
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (!availableYears.includes(analysisYear) && availableYears.length > 0) {
      setAnalysisYear(availableYears[0]);
    }
  }, [analysisYear, availableYears]);

  useEffect(() => {
    const loadVentes = async () => {
      if (!profile || !analysisYear) return;
      setAnalysisLoading(true);
      let query = supabase
        .from('ventes')
        .select('ca_ht, date_vente, filiale_id, marque')
        .gte('date_vente', `${analysisYear}-01-01`)
        .lte('date_vente', `${analysisYear}-12-31`);
      if (filialeId) {
        query = query.eq('filiale_id', filialeId);
      }
      const { data } = await query;
      setVentes((data as VenteRow[]) || []);
      setAnalysisLoading(false);
    };
    loadVentes();
  }, [analysisYear, filialeId, profile]);

  const normalizeKey = (value: string | null | undefined) =>
    (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const resolvePlanType = (plan: string | null | undefined) => {
    const normalized = normalizeKey(plan);
    if (normalized.includes('quantite')) return 'qty';
    if (normalized.includes('marge')) return 'marge';
    return 'ca';
  };

  const ventesAgg = useMemo(() => {
    const map = new Map<
      string,
      {
        caByMonth: number[];
        qtyByMonth: number[];
      }
    >();
    ventes.forEach((vente) => {
      if (!vente.filiale_id || !vente.date_vente) return;
      const date = new Date(vente.date_vente);
      if (Number.isNaN(date.getTime())) return;
      const monthIdx = date.getMonth();
      if (monthIdx < 0 || monthIdx > 11) return;
      const marqueKey = normalizeKey(vente.marque);
      const key = `${vente.filiale_id}::${marqueKey}`;
      const entry = map.get(key) || {
        caByMonth: Array.from({ length: 12 }, () => 0),
        qtyByMonth: Array.from({ length: 12 }, () => 0),
      };
      entry.caByMonth[monthIdx] += Number(vente.ca_ht || 0);
      entry.qtyByMonth[monthIdx] += 1;
      map.set(key, entry);
    });
    return map;
  }, [ventes]);

  const analysisRows = useMemo((): BudgetAnalysisRow[] => {
    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth();
    const monthsElapsed =
      analysisYear < currentYear ? 12 : analysisYear === currentYear ? currentMonthIndex + 1 : 0;

    const sumBudgetMonths = (row: Budget, months: number) =>
      monthFields.slice(0, months).reduce((sum, field) => sum + (row[field.key] || 0), 0);

    const sumByMonths = (values: number[] | undefined, months: number) =>
      values ? values.slice(0, months).reduce((sum, value) => sum + value, 0) : 0;

    const rows = budgets
      .filter((row) => row.annee === analysisYear)
      .filter((row) => (!filialeId ? true : row.filiale_id === filialeId))
      .filter((row) => (analysisPlan ? normalizeKey(row.plan_compte) === normalizeKey(analysisPlan) : true))
      .filter((row) => (analysisConstructeur ? normalizeKey(row.constructeur) === normalizeKey(analysisConstructeur) : true))
      .filter((row) => (analysisProduit ? normalizeKey(row.produit) === normalizeKey(analysisProduit) : true))
      .map((row) => {
        const planType = resolvePlanType(row.plan_compte);
        const budgetYtd = monthsElapsed > 0 ? sumBudgetMonths(row, monthsElapsed) : 0;
        const budgetTotal = row.cumul_fin_dec ?? sumBudgetMonths(row, 12);

        let actualYtd: number | null = null;
        if (planType !== 'marge') {
          let ca = 0;
          let qty = 0;
          const marqueKey = normalizeKey(row.constructeur);
          ventesAgg.forEach((entry, key) => {
            const [keyFiliale, keyMarque] = key.split('::');
            if (keyFiliale !== row.filiale_id) return;
            if (marqueKey && keyMarque !== marqueKey) return;
            ca += sumByMonths(entry.caByMonth, monthsElapsed);
            qty += sumByMonths(entry.qtyByMonth, monthsElapsed);
          });
          actualYtd = planType === 'qty' ? qty : ca;
        }

        const variance = actualYtd === null ? null : actualYtd - budgetYtd;
        const variancePct =
          actualYtd === null || budgetYtd <= 0 ? null : (actualYtd - budgetYtd) / budgetYtd;
        const eac =
          actualYtd === null || monthsElapsed <= 0 ? null : (actualYtd / monthsElapsed) * 12;
        const eacVariance = eac === null ? null : eac - budgetTotal;

        return {
          id: row.id,
          filiale_id: row.filiale_id,
          filiale_label: filialeMap.get(row.filiale_id) || row.filiale_id,
          produit: row.produit || null,
          plan_compte: row.plan_compte || null,
          constructeur: row.constructeur || null,
          budget_ytd: budgetYtd,
          budget_total: budgetTotal,
          actual_ytd: actualYtd,
          variance,
          variance_pct: variancePct,
          eac,
          eac_variance: eacVariance,
          plan_type: planType,
        };
      });

    return rows.sort((a, b) => (b.budget_total || 0) - (a.budget_total || 0));
  }, [analysisConstructeur, analysisPlan, analysisProduit, analysisYear, budgets, filialeId, filialeMap, ventesAgg]);

  const analysisSummary = useMemo(() => {
    if (!analysisPlan) return null;
    const filtered = analysisRows.filter((row) => row.plan_type === resolvePlanType(analysisPlan));
    if (filtered.length === 0) return null;
    const summary = filtered.reduce(
      (acc, row) => {
        acc.budgetYtd += row.budget_ytd;
        acc.budgetTotal += row.budget_total;
        if (row.actual_ytd !== null) {
          acc.actualYtd += row.actual_ytd;
        }
        return acc;
      },
      { budgetYtd: 0, budgetTotal: 0, actualYtd: 0 }
    );
    const variance = summary.actualYtd - summary.budgetYtd;
    const variancePct = summary.budgetYtd > 0 ? variance / summary.budgetYtd : null;
    const monthsElapsed =
      analysisYear < new Date().getFullYear()
        ? 12
        : analysisYear === new Date().getFullYear()
        ? new Date().getMonth() + 1
        : 0;
    const eac = monthsElapsed > 0 ? (summary.actualYtd / monthsElapsed) * 12 : null;
    const eacVariance = eac === null ? null : eac - summary.budgetTotal;
    return {
      ...summary,
      variance,
      variancePct,
      eac,
      eacVariance,
    };
  }, [analysisPlan, analysisRows, analysisYear]);

  const analysisHighlights = useMemo(() => {
    const rows = analysisRows.filter((row) => row.actual_ytd !== null && row.variance !== null);
    if (rows.length === 0) {
      return { topDown: [], topUp: [] as BudgetAnalysisRow[] };
    }
    const topDown = rows
      .filter((row) => (row.variance ?? 0) < 0)
      .sort((a, b) => (a.variance ?? 0) - (b.variance ?? 0))
      .slice(0, 5);
    const topUp = rows
      .filter((row) => (row.variance ?? 0) > 0)
      .sort((a, b) => (b.variance ?? 0) - (a.variance ?? 0))
      .slice(0, 5);
    return { topDown, topUp };
  }, [analysisRows]);

  const exportAnalysisCsv = () => {
    const rows = analysisRows.map((row) => ({
      filiale: row.filiale_label,
      produit: row.produit || '',
      plan_compte: row.plan_compte || '',
      constructeur: row.constructeur || '',
      budget_ytd: row.budget_ytd,
      realise_ytd: row.actual_ytd ?? '',
      ecart: row.variance ?? '',
      taux: row.variance_pct !== null ? (row.variance_pct * 100).toFixed(1) : '',
      budget_annuel: row.budget_total,
      eac: row.eac ?? '',
      ecart_eac: row.eac_variance ?? '',
    }));
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const lines = [
      columns.join(','),
      ...rows.map((row) => columns.map((col) => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `budget_suivi_${analysisYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAnalysisPdf = () => {
    const columns = [
      'Filiale',
      'Produit',
      'Plan',
      'Constructeur',
      'Budget YTD',
      'Realise YTD',
      'Ecart',
      'Taux',
      'Budget Annuel',
      'EAC',
    ];
    const rows = analysisRows.map((row) => [
      row.filiale_label,
      row.produit || '-',
      row.plan_compte || '-',
      row.constructeur || '-',
      row.budget_ytd.toLocaleString('fr-FR'),
      row.actual_ytd === null ? '-' : row.actual_ytd.toLocaleString('fr-FR'),
      row.variance === null ? '-' : row.variance.toLocaleString('fr-FR'),
      row.variance_pct === null ? '-' : `${(row.variance_pct * 100).toFixed(1)}%`,
      row.budget_total.toLocaleString('fr-FR'),
      row.eac === null ? '-' : row.eac.toLocaleString('fr-FR'),
    ]);
    const headerCells = columns.map((col) => `<th>${col}</th>`).join('');
    const bodyRows = rows
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
      .join('');
    const filters = [
      `Annee: ${analysisYear}`,
      analysisPlan ? `Plan: ${analysisPlan}` : null,
      analysisConstructeur ? `Constructeur: ${analysisConstructeur}` : null,
      analysisProduit ? `Produit: ${analysisProduit}` : null,
    ]
      .filter(Boolean)
      .join(' | ');
    const html = `
      <html>
        <head>
          <title>Suivi Budget</title>
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
          <h1>Suivi budget vs realise</h1>
          <p>${filters || 'Filtres: aucun'}</p>
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
  };

  const submit = async () => {
    if (!profile) return;
    if (!filialeId) {
      setSubmitError(
        isAdmin
          ? 'Selectionnez une filiale active pour continuer.'
          : 'Aucune filiale assignee au profil. Contactez un administrateur.'
      );
      return;
    }

    const produitValue =
      formData.produit === 'Autres' ? formData.produit_autre.trim() : formData.produit.trim();
    const planValue =
      formData.plan_compte === 'Autres' ? formData.plan_compte_autre.trim() : formData.plan_compte.trim();
    const constructeurValue =
      formData.constructeur === 'Autres' ? formData.constructeur_autre.trim() : formData.constructeur.trim();
    const territoireValue = formData.territoire.trim();

    if (formData.produit === 'Autres' && !produitValue) {
      setSubmitError('Merci de renseigner le produit quand "Autres" est choisi.');
      return;
    }
    if (formData.plan_compte === 'Autres' && !planValue) {
      setSubmitError('Merci de renseigner le plan comptable quand "Autres" est choisi.');
      return;
    }
    if (formData.constructeur === 'Autres' && !constructeurValue) {
      setSubmitError('Merci de renseigner le constructeur quand "Autres" est choisi.');
      return;
    }

    const hasMonthValue = monthFields.some((field) => Number(monthValues[field.key]) > 0);
    if (!hasMonthValue) {
      setSubmitError('Renseignez au moins un mois avec un montant > 0.');
      return;
    }

    const monthPayload = monthFields.reduce<Record<MonthKey, number | null>>((acc, field) => {
      const raw = Number(monthValues[field.key]) || 0;
      acc[field.key] = raw === 0 ? null : raw;
      return acc;
    }, {} as Record<MonthKey, number | null>);

    const cumulFinDec = monthFields.reduce((sum, field) => {
      return sum + (Number(monthValues[field.key]) || 0);
    }, 0);

    const planN1 = formData.plan_n1 === '' ? null : Number(formData.plan_n1);
    const planN2 = formData.plan_n2 === '' ? null : Number(formData.plan_n2);

    setSubmitError('');
    setSubmitLoading(true);
    const payload: BudgetInsert = {
      filiale_id: filialeId,
      annee: Number(formData.annee),
      territoire: territoireValue || null,
      produit: produitValue || null,
      plan_compte: planValue || null,
      constructeur: constructeurValue || null,
      plan_n1: planN1,
      plan_n2: planN2,
      cumul_fin_dec: cumulFinDec || null,
      created_by: profile.id,
      ...monthPayload,
    };

    const { error } = await supabase.from('budgets').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    setSubmitLoading(false);
    setIsModalOpen(false);
    setMonthValues(monthValuesInitial);
    setFormData({
      ...formData,
      plan_n1: '',
      plan_n2: '',
    });
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .order('annee', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setBudgets(data as Budget[]);
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('fr-FR');
  };

  const formatAnalysisValue = (value: number | null | undefined, planType: BudgetAnalysisRow['plan_type']) => {
    if (value === null || value === undefined) return '-';
    const formatted = value.toLocaleString('fr-FR');
    return planType === 'qty' ? formatted : `${formatted} EUR`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Budgets</h1>
          <p className="text-slate-600">
            Saisie annuelle par Produit / Plan de Compte / Constructeur (alignement strict PDF).
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full lg:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 rounded-lg shadow hover:from-emerald-600 hover:to-teal-700"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter un budget</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Annee</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Produit</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Plan Compte</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Territoire</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Constructeur</th>
                {monthFields.map((m) => (
                  <th key={m.key} className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                    {m.label}
                  </th>
                ))}
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Cumul fin dec</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Plan N+1</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Plan N+2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {budgets.map((row) => {
                const monthSum = monthFields.reduce((sum, field) => {
                  const value = row[field.key] ?? 0;
                  return sum + (value || 0);
                }, 0);
                const cumul = row.cumul_fin_dec ?? monthSum;
                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{row.annee}</td>
                    <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                      {row.produit || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                      {row.plan_compte || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                      {row.territoire || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                      {row.constructeur || '-'}
                    </td>
                    {monthFields.map((m) => (
                      <td key={m.key} className="py-3 px-4 text-sm text-right text-slate-900">
                        {formatNumber(row[m.key])}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-sm text-right font-semibold text-slate-900">
                      {formatNumber(cumul)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-900">
                      {formatNumber(row.plan_n1)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-900">
                      {formatNumber(row.plan_n2)}
                    </td>
                  </tr>
                );
              })}
              {budgets.length === 0 && (
                <tr>
                  <td colSpan={5 + monthFields.length + 3} className="py-6 text-center text-sm text-slate-500">
                    Aucun budget saisi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-4">
          {budgets.map((row) => {
            const monthSum = monthFields.reduce((sum, field) => {
              const value = row[field.key] ?? 0;
              return sum + (value || 0);
            }, 0);
            const cumul = row.cumul_fin_dec ?? monthSum;
            const filledMonths = monthFields.filter((field) => {
              const value = row[field.key];
              return value !== null && value !== undefined && value !== 0;
            });
            return (
              <div key={row.id} className="rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{row.produit || '-'}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {row.plan_compte || '-'} / {row.constructeur || '-'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{row.territoire || '-'}</p>
                    <p className="text-xs text-slate-500 mt-1">{row.annee}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-slate-900 mt-2">{formatNumber(cumul)}</p>
                    <p className="text-xs text-slate-500">Cumul fin dec</p>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 space-y-3">
                  {filledMonths.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {filledMonths.map((field) => (
                        <div key={field.key} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                          <span className="text-slate-600">{field.label}</span>
                          <span className="font-semibold text-slate-900">
                            {formatNumber(row[field.key])}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Aucun montant saisi.</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                      <span className="text-slate-600">Plan N+1</span>
                      <span className="font-semibold text-slate-900">{formatNumber(row.plan_n1)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                      <span className="text-slate-600">Plan N+2</span>
                      <span className="font-semibold text-slate-900">{formatNumber(row.plan_n2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {budgets.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-500">
              Aucun budget saisi.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Suivi budget vs realise
            </h2>
            <p className="text-sm text-slate-600">
              Analyse YTD et projection annuelle. Les marges reelles sont affichees si les couts sont disponibles.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportAnalysisCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={exportAnalysisPdf}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Annee</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={analysisYear}
              onChange={(e) => setAnalysisYear(Number(e.target.value))}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Plan comptable</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={analysisPlan}
              onChange={(e) => setAnalysisPlan(e.target.value)}
            >
              {availablePlans.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Constructeur</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={analysisConstructeur}
              onChange={(e) => setAnalysisConstructeur(e.target.value)}
            >
              <option value="">Tous</option>
              {availableConstructeurs.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Produit</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={analysisProduit}
              onChange={(e) => setAnalysisProduit(e.target.value)}
            >
              <option value="">Tous</option>
              {availableProduits.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {analysisLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <>
            {analysisSummary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Budget YTD</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatAnalysisValue(analysisSummary.budgetYtd, resolvePlanType(analysisPlan))}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Realise YTD</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatAnalysisValue(analysisSummary.actualYtd, resolvePlanType(analysisPlan))}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Ecart YTD</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatAnalysisValue(analysisSummary.variance, resolvePlanType(analysisPlan))}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {analysisSummary.variancePct === null
                      ? '-'
                      : `${(analysisSummary.variancePct * 100).toFixed(1)}%`}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">EAC annuel</p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatAnalysisValue(analysisSummary.eac, resolvePlanType(analysisPlan))}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {analysisSummary.eacVariance === null
                      ? '-'
                      : `${analysisSummary.eacVariance >= 0 ? '+' : ''}${analysisSummary.eacVariance.toLocaleString('fr-FR')}`}
                  </p>
                </div>
              </div>
            )}

            {(analysisHighlights.topDown.length > 0 || analysisHighlights.topUp.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-rose-900">Ecarts negatifs prioritaires</p>
                    <span className="text-xs text-rose-700">Top 5</span>
                  </div>
                  <div className="space-y-2">
                    {analysisHighlights.topDown.length === 0 ? (
                      <p className="text-sm text-rose-700">Aucun ecart negatif detecte.</p>
                    ) : (
                      analysisHighlights.topDown.map((row) => (
                        <div key={`${row.id}-down`} className="flex items-center justify-between text-sm">
                          <div className="text-rose-900">
                            {row.filiale_label} · {row.constructeur || row.produit || '-'}
                          </div>
                          <div className="font-semibold text-rose-700">
                            {formatAnalysisValue(row.variance, row.plan_type)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-emerald-900">Ecarts positifs</p>
                    <span className="text-xs text-emerald-700">Top 5</span>
                  </div>
                  <div className="space-y-2">
                    {analysisHighlights.topUp.length === 0 ? (
                      <p className="text-sm text-emerald-700">Aucun ecart positif detecte.</p>
                    ) : (
                      analysisHighlights.topUp.map((row) => (
                        <div key={`${row.id}-up`} className="flex items-center justify-between text-sm">
                          <div className="text-emerald-900">
                            {row.filiale_label} · {row.constructeur || row.produit || '-'}
                          </div>
                          <div className="font-semibold text-emerald-700">
                            {formatAnalysisValue(row.variance, row.plan_type)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Filiale</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Produit</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Plan</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Constructeur</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Budget YTD</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Realise YTD</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Ecart</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Taux</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Budget annuel</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">EAC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {analysisRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-sm text-slate-900">{row.filiale_label}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">{row.produit || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">{row.plan_compte || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">{row.constructeur || '-'}</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-900">
                        {formatAnalysisValue(row.budget_ytd, row.plan_type)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-slate-900">
                        {formatAnalysisValue(row.actual_ytd, row.plan_type)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-slate-900">
                        {formatAnalysisValue(row.variance, row.plan_type)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-slate-700">
                        {row.variance_pct === null ? '-' : `${(row.variance_pct * 100).toFixed(1)}%`}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-slate-900">
                        {formatAnalysisValue(row.budget_total, row.plan_type)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-slate-900">
                        {formatAnalysisValue(row.eac, row.plan_type)}
                      </td>
                    </tr>
                  ))}
                  {analysisRows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-sm text-slate-500">
                        Aucun budget disponible pour ce filtre.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
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

            <div className="flex items-center gap-2 mb-3">
              <PiggyBank className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-semibold text-slate-900">Budget annuel</h2>
            </div>

            {!showAllTabs && (
              <ModalTabs
                tabs={[
                  { id: 'infos', label: 'Infos' },
                  { id: 'mensuel', label: 'Mensuel' },
                ]}
                activeTab={activeTab}
                onChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
              />
            )}

            {(showAllTabs || activeTab === 'infos') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {!filialeId && (
                  <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Aucune filiale assignee au profil. Contactez un administrateur pour pouvoir saisir.
                  </div>
                )}

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
                  <label className="text-sm font-medium text-slate-700">Territoire</label>
                  <input
                    list={territoireListId}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.territoire}
                    onChange={(e) => setFormData({ ...formData, territoire: e.target.value })}
                    placeholder="Choisir ou saisir"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Produit</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.produit}
                    onChange={(e) => setFormData({ ...formData, produit: e.target.value })}
                  >
                    <option value="">Choisir</option>
                    <option value="Agricole">Agricole</option>
                    <option value="Lift trucks">Lift trucks</option>
                    <option value="Autres">Autres</option>
                  </select>
                  {formData.produit === 'Autres' && (
                    <input
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent mt-2"
                      value={formData.produit_autre}
                      onChange={(e) => setFormData({ ...formData, produit_autre: e.target.value })}
                      placeholder="Produit personnalise"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Plan Compte</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.plan_compte}
                    onChange={(e) => setFormData({ ...formData, plan_compte: e.target.value })}
                  >
                    <option value="">Choisir</option>
                    <option value="Chiffre d'affaires">Chiffre d'affaires</option>
                    <option value="Marge Brute">Marge Brute</option>
                    <option value="Quantites facturees">Quantites facturees</option>
                    <option value="Autres">Autres</option>
                  </select>
                  {formData.plan_compte === 'Autres' && (
                    <input
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent mt-2"
                      value={formData.plan_compte_autre}
                      onChange={(e) => setFormData({ ...formData, plan_compte_autre: e.target.value })}
                      placeholder="Plan de compte personnalise"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Constructeur</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.constructeur}
                    onChange={(e) => setFormData({ ...formData, constructeur: e.target.value })}
                  >
                    <option value="">Choisir</option>
                    <option value="DIVERS">DIVERS</option>
                    <option value="MASSEY FERGUSON">MASSEY FERGUSON</option>
                    <option value="NARDI">NARDI</option>
                    <option value="KALMAR">KALMAR</option>
                    <option value="MANITOU">MANITOU</option>
                    <option value="Autres">Autres</option>
                  </select>
                  {formData.constructeur === 'Autres' && (
                    <input
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent mt-2"
                      value={formData.constructeur_autre}
                      onChange={(e) => setFormData({ ...formData, constructeur_autre: e.target.value })}
                      placeholder="Constructeur personnalise"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Plan N+1</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.plan_n1}
                    onChange={(e) => setFormData({ ...formData, plan_n1: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Plan N+2</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.plan_n2}
                    onChange={(e) => setFormData({ ...formData, plan_n2: e.target.value })}
                  />
                </div>
              </div>
            )}

            {(showAllTabs || activeTab === 'mensuel') && (
              <div className="mt-3">
                <p className="text-sm font-semibold text-slate-800 mb-2">Montants mensuels</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {monthFields.map((m) => (
                    <div key={m.key} className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">{m.label}</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        value={monthValues[m.key]}
                        onChange={(e) =>
                          setMonthValues({ ...monthValues, [m.key]: Number(e.target.value) || 0 })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {submitError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <datalist id={territoireListId}>
              {territoireOptions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                disabled={submitLoading}
              >
                Annuler
              </button>
              <button
                onClick={submit}
                disabled={submitLoading || !filialeId}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
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










