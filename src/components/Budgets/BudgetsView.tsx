import { useEffect, useMemo, useState } from 'react';
import { Plus, X, PiggyBank } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type Budget = Database['public']['Tables']['budgets']['Row'] & {
  produit?: string | null;
  plan_compte?: string | null;
  constructeur?: string | null;
};
type BudgetInsert = Database['public']['Tables']['budgets']['Insert'];

const monthLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jui', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

export function BudgetsView() {
  const { profile } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    annee: new Date().getFullYear(),
    type_budget: 'Ventes_machines' as Budget['type_budget'],
    devise: 'XAF',
    commentaires: '',
    produit: '',
    produit_autre: '',
    plan_compte: '',
    plan_compte_autre: '',
    constructeur: '',
    constructeur_autre: '',
    devise_autre: '',
  });
  const monthValuesInitial = useMemo(
    () =>
      Object.fromEntries(
        monthLabels.map((m) => [m, 0])
      ) as Record<string, number>,
    []
  );
  const [monthValues, setMonthValues] = useState<Record<string, number>>(monthValuesInitial);

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      const base = supabase
        .from('budgets')
        .select('*')
        .order('annee', { ascending: false })
        .order('mois', { ascending: true });
      // Laisser les RLS décider : admins voient tout, autres selon leur filiale
      const { data, error } = await base.limit(500);
      if (!error && data) setBudgets(data as Budget[]);

            setLoading(false);
    };
    load();
  }, [profile]);

  const submit = async () => {
    if (!profile) return;
    const filialeId = profile.filiale_id;
    if (!filialeId) {
      setSubmitError('Aucune filiale assignée au profil. Contactez un administrateur.');
      return;
    }
    if (!formData.type_budget) {
      setSubmitError('Type de budget requis.');
      return;
    }
    const produitValue =
      formData.produit === 'Autres' ? formData.produit_autre.trim() : formData.produit.trim();
    const planValue =
      formData.plan_compte === 'Autres' ? formData.plan_compte_autre.trim() : formData.plan_compte.trim();
    const constructeurValue =
      formData.constructeur === 'Autres' ? formData.constructeur_autre.trim() : formData.constructeur.trim();
    const deviseValue =
      formData.devise === 'Autres' ? formData.devise_autre.trim() : formData.devise.trim();

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
    if (formData.devise === 'Autres' && !deviseValue) {
      setSubmitError('Merci de renseigner la devise quand "Autres" est choisi.');
      return;
    }

    const rows = Object.entries(monthValues)
      .filter(([, val]) => Number(val) > 0)
      .map(([moisLabel, val]) => {
        const monthNumber = monthLabels.indexOf(moisLabel) + 1;
        return {
          filiale_id: filialeId,
          annee: Number(formData.annee),
          mois: `${formData.annee}-${String(monthNumber).padStart(2, '0')}`,
          type_budget: formData.type_budget,
          montant: Number(val),
          devise: deviseValue || 'XAF',
          commentaires: formData.commentaires || null,
          created_by: profile.id,
          produit: produitValue || null,
          plan_compte: planValue || null,
          constructeur: constructeurValue || null,
        } as BudgetInsert;
      });

    if (rows.length === 0) {
      setSubmitError('Renseignez au moins un mois avec un montant > 0.');
      return;
    }

    setSubmitError('');
    setSubmitLoading(true);
    const { error } = await supabase.from('budgets').insert(rows as BudgetInsert[]);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    setSubmitLoading(false);
    setIsModalOpen(false);
    setMonthValues(monthValuesInitial);
    setFormData({ ...formData, commentaires: '' });
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .order('annee', { ascending: false })
      .order('mois', { ascending: true })
      .limit(500);
    if (data) setBudgets(data as Budget[]);
  };

  type PivotRow = {
    annee: number | null;
    produit: string;
    plan_compte: string;
    constructeur: string;
    type_budget: Budget['type_budget'];
    devise: string;
    mois: Record<string, number>;
    cumul?: number;
  };

  const pivotRows = useMemo(() => {
    const grouped = budgets.reduce<Record<string, PivotRow>>((acc, b) => {
      const key = `${b.annee}||${b.produit || ''}||${b.plan_compte || ''}||${b.constructeur || ''}||${b.type_budget}||${b.devise}`;
      if (!acc[key]) {
        acc[key] = {
          annee: b.annee,
          produit: b.produit || '—',
          plan_compte: b.plan_compte || '—',
          constructeur: b.constructeur || '—',
          type_budget: b.type_budget,
          devise: b.devise || 'XAF',
          mois: Object.fromEntries(monthLabels.map((m) => [m, 0])),
        };
      }
      const monthNumber = b.mois ? Number((b.mois as string).split('-').pop()) : 0;
      const label = monthLabels[monthNumber - 1];
      if (label) {
        acc[key].mois[label] = (acc[key].mois[label] || 0) + (b.montant || 0);
      }
      return acc;
    }, {});

    return Object.values(grouped).map((row) => {
      const cumul = monthLabels.reduce((sum, m) => sum + (row.mois[m] || 0), 0);
      return { ...row, cumul };
    });
  }, [budgets]);

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
            Saisie mensuelle par Produit / Plan de Compte / Constructeur (aligné sur le modèle Excel/PDF).
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
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Année</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Produit</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Plan Compte</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Constructeur</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
              {monthLabels.map((m) => (
                <th key={m} className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  {m}
                </th>
              ))}
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Cumul</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {pivotRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 text-sm font-medium text-slate-900">{row.annee}</td>
                <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">{row.produit}</td>
                <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">{row.plan_compte}</td>
                <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">{row.constructeur}</td>
                <td className="py-3 px-4 text-sm text-slate-700">{row.type_budget}</td>
                {monthLabels.map((m) => (
                  <td key={m} className="py-3 px-4 text-sm text-right text-slate-900">
                    {row.mois[m] ? `${row.mois[m].toLocaleString()} ${row.devise}` : '—'}
                  </td>
                ))}
                <td className="py-3 px-4 text-sm text-right font-semibold text-slate-900">
                  {row.cumul.toLocaleString()} {row.devise}
                </td>
              </tr>
            ))}
            {pivotRows.length === 0 && (
              <tr>
                <td colSpan={5 + monthLabels.length + 1} className="py-6 text-center text-sm text-slate-500">
                  Aucun budget saisi.
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-4">
          {pivotRows.map((row, idx) => {
            const filledMonths = monthLabels.filter((m) => Number(row.mois[m]) > 0);
            return (
              <div key={idx} className="rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{row.produit}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {row.plan_compte} / {row.constructeur}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{row.annee}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      {row.type_budget}
                    </span>
                    <p className="text-base font-semibold text-slate-900 mt-2">
                      {row.cumul.toLocaleString()} {row.devise}
                    </p>
                    <p className="text-xs text-slate-500">Cumul</p>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  {filledMonths.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {filledMonths.map((m) => (
                        <div key={m} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                          <span className="text-slate-600">{m}</span>
                          <span className="font-semibold text-slate-900">
                            {row.mois[m].toLocaleString()} {row.devise}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Aucun montant saisi.</p>
                  )}
                </div>
              </div>
            );
          })}
          {pivotRows.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-500">
              Aucun budget saisi.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <PiggyBank className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-semibold text-slate-900">Budget mensuel</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!profile?.filiale_id && (
                <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Aucune filiale assignée au profil. Contactez un administrateur pour pouvoir saisir.
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Année</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.annee}
                  onChange={(e) => setFormData({ ...formData, annee: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Type</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.type_budget}
                  onChange={(e) => setFormData({ ...formData, type_budget: e.target.value as Budget['type_budget'] })}
                >
                  <option value="Ventes_machines">Ventes machines</option>
                  <option value="Ventes_pieces">Ventes pièces</option>
                  <option value="Ventes_services">Ventes services</option>
                  <option value="Charges">Charges</option>
                  <option value="Investissements">Investissements</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Devise</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.devise}
                  onChange={(e) => setFormData({ ...formData, devise: e.target.value })}
                >
                  <option value="">Choisir</option>
                  <option value="XOF">XOF</option>
                  <option value="XAF">XAF</option>
                  <option value="EUR">EUR</option>
                  <option value="DOL">DOL</option>
                  <option value="GNF">GNF</option>
                  <option value="Autres">Autres</option>
                </select>
                {formData.devise === 'Autres' && (
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent mt-2"
                    value={formData.devise_autre}
                    onChange={(e) => setFormData({ ...formData, devise_autre: e.target.value })}
                    placeholder="Devise personnalisée"
                  />
                )}
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
                    placeholder="Produit personnalisé"
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
                  <option value="Quantités facturées">Quantités facturées</option>
                  <option value="Autres">Autres</option>
                </select>
                {formData.plan_compte === 'Autres' && (
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent mt-2"
                    value={formData.plan_compte_autre}
                    onChange={(e) => setFormData({ ...formData, plan_compte_autre: e.target.value })}
                    placeholder="Plan de compte personnalisé"
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
                    placeholder="Constructeur personnalisé"
                  />
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Commentaires</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.commentaires}
                  onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-800 mb-2">Montants mensuels</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {monthLabels.map((m) => (
                  <div key={m} className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">{m}</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      value={monthValues[m]}
                      onChange={(e) =>
                        setMonthValues({ ...monthValues, [m]: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

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
                disabled={submitLoading || !profile?.filiale_id}
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
