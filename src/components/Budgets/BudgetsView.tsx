import { useEffect, useMemo, useState } from 'react';
import { Plus, X, PiggyBank } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useFilialeContext } from '../../contexts/FilialeContext';
import type { Database } from '../../lib/database.types';
import { ModalTabs } from '../ui/ModalTabs';

type Budget = Database['public']['Tables']['budgets']['Row'];
type BudgetInsert = Database['public']['Tables']['budgets']['Insert'];

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

export function BudgetsView() {
  const { profile } = useAuth();
  const { filialeId, isAdmin } = useFilialeContext();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'infos' | 'mensuel'>('infos');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    annee: new Date().getFullYear(),
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
                  <td colSpan={4 + monthFields.length + 3} className="py-6 text-center text-sm text-slate-500">
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

            <ModalTabs
              tabs={[
                { id: 'infos', label: 'Infos' },
                { id: 'mensuel', label: 'Mensuel' },
              ]}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
            />

            {activeTab === 'infos' && (
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

            {activeTab === 'mensuel' && (
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





