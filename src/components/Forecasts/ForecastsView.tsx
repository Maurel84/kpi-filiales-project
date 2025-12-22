import { useCallback, useEffect, useState } from 'react';
import { Plus, Calendar, Filter, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Marque = Database['public']['Tables']['marques']['Row'];
type Modele = Database['public']['Tables']['modeles_produits']['Row'];
type Categorie = Database['public']['Tables']['categories_produits']['Row'];

type PrevisionRow = Database['public']['Tables']['previsions_ventes_modeles']['Row'] & {
  marques?: { nom: string } | null;
  modeles_produits?: { nom_complet: string; code_modele: string } | null;
  categories_produits?: { nom: string } | null;
};

type PrevisionType = PrevisionRow['type_prevision'];
type PrevisionTypeFilter = PrevisionType | 'all';

const monthLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jui', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ForecastsView() {
  const { profile } = useAuth();
  const [marques, setMarques] = useState<Marque[]>([]);
  const [modeles, setModeles] = useState<Modele[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [rows, setRows] = useState<PrevisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarque, setSelectedMarque] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<PrevisionTypeFilter>('all');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    marque_id: '',
    modele_id: '',
    annee: 2026,
    mois: 1,
    quantite_prevue: 0,
    type_prevision: 'Forecast' as 'Budget' | 'Forecast' | 'Commandes',
  });

  const loadData = useCallback(async () => {
    if (!profile) return;

    const [{ data: marquesData }, { data: modelesData }, { data: categoriesData }] = await Promise.all([
      supabase.from('marques').select('id, nom').eq('actif', true).order('nom'),
      supabase
        .from('modeles_produits')
        .select('id, nom_complet, code_modele, marque_id, categorie_id, actif')
        .eq('actif', true)
        .order('nom_complet'),
      supabase.from('categories_produits').select('id, nom').order('nom'),
    ]);

    if (marquesData) setMarques(marquesData as Marque[]);
    if (modelesData) setModeles(modelesData as Modele[]);
    if (categoriesData) setCategories(categoriesData as Categorie[]);

    const filialeFilter = profile.role === 'admin_siege' ? {} : { filiale_id: profile.filiale_id };

    let query = supabase
      .from('previsions_ventes_modeles')
      .select(
        '*, marques(nom), modeles_produits(nom_complet, code_modele), categories_produits(nom)'
      )
      .eq('annee', selectedYear)
      .match(filialeFilter)
      .order('mois', { ascending: true });

    if (selectedMarque !== 'all') {
      query = query.eq('marque_id', selectedMarque);
    }
    if (selectedType !== 'all') {
      query = query.eq('type_prevision', selectedType);
    }

    const { data, error } = await query;
    if (!error && data) {
      setRows(data as unknown as PrevisionRow[]);
    }
    setLoading(false);
  }, [profile, selectedMarque, selectedType, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, annee: selectedYear }));
  }, [selectedYear]);

  const submitForecast = async () => {
    if (!profile) return;
    if (!formData.marque_id || !formData.modele_id || !formData.quantite_prevue) {
      setSubmitError('Marque, modèle et quantité prévue sont obligatoires.');
      return;
    }
    const selectedModele = modeles.find((modele) => modele.id === formData.modele_id);
    if (!selectedModele) {
      setSubmitError('Modèle invalide.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);

    const payload = {
      marque_id: selectedModele.marque_id,
      modele_id: selectedModele.id,
      code_modele: selectedModele.code_modele,
      categorie_id: selectedModele.categorie_id ?? null,
      annee: Number(formData.annee),
      mois: Number(formData.mois),
      quantite_prevue: Number(formData.quantite_prevue),
      type_prevision: formData.type_prevision,
      filiale_id: profile.filiale_id || null,
      modifie_par_id: profile.id,
      date_modification: new Date().toISOString(),
    };

    const { error } = await supabase.from('previsions_ventes_modeles').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }

    setSubmitLoading(false);
    setIsModalOpen(false);
    setFormData({
      marque_id: '',
      modele_id: '',
      annee: selectedYear,
      mois: 1,
      quantite_prevue: 0,
      type_prevision: 'Forecast',
    });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Prévisions (Forecasts)</h1>
            <p className="text-slate-600">Prévisions modèle/mois (FORECAST.csv)</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-5 py-2.5 rounded-lg shadow hover:from-amber-600 hover:to-yellow-700"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter une prévision</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Prévisions par modèle</h2>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={selectedMarque}
                onChange={(e) => setSelectedMarque(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="all">Toutes les marques</option>
                {marques.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as PrevisionTypeFilter)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="all">Tous les types</option>
                <option value="Forecast">Forecast</option>
                <option value="Budget">Budget</option>
                <option value="Commandes">Commandes</option>
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Marque</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Modèle</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Code</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Catégorie</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Année</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Mois</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Quantité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => {
                  const categorieNom =
                    row.categories_produits?.nom ||
                    categories.find((categorie) => categorie.id === row.categorie_id)?.nom ||
                    '-';
                  const marqueNom = row.marques?.nom || marques.find((marque) => marque.id === row.marque_id)?.nom || '-';
                  const modeleNom =
                    row.modeles_produits?.nom_complet ||
                    modeles.find((modele) => modele.id === row.modele_id)?.nom_complet ||
                    '-';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-sm text-slate-900">{marqueNom}</td>
                      <td className="py-3 px-4 text-sm text-slate-900">{modeleNom}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        {row.modeles_produits?.code_modele || row.code_modele || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">{categorieNom}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">{row.annee}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        {row.mois ? monthLabels[row.mois - 1] : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">{row.type_prevision}</td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-slate-900">
                        {row.quantite_prevue || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {rows.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Aucune donnée de prévision disponible</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Saisir une prévision modèle/mois</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Marque</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.marque_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      marque_id: e.target.value,
                      modele_id: '',
                    })
                  }
                >
                  <option value="">Sélectionner une marque</option>
                  {marques.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Modèle</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.modele_id}
                  onChange={(e) => setFormData({ ...formData, modele_id: e.target.value })}
                >
                  <option value="">Sélectionner un modèle</option>
                  {modeles
                    .filter((mod) => !formData.marque_id || mod.marque_id === formData.marque_id)
                    .map((mod) => (
                      <option key={mod.id} value={mod.id}>
                        {mod.nom_complet} ({mod.code_modele})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Année</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.annee}
                  onChange={(e) => setFormData({ ...formData, annee: Number(e.target.value) })}
                  min={2023}
                  max={2030}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Mois</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.mois}
                  onChange={(e) => setFormData({ ...formData, mois: Number(e.target.value) })}
                >
                  {monthLabels.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Quantité prévue</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.quantite_prevue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantite_prevue: Number(e.target.value),
                    })
                  }
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Type de prévision</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.type_prevision}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type_prevision: e.target.value as 'Budget' | 'Forecast' | 'Commandes',
                    })
                  }
                >
                  <option value="Forecast">Forecast</option>
                  <option value="Budget">Budget</option>
                  <option value="Commandes">Commandes</option>
                </select>
              </div>

              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                disabled={submitLoading}
              >
                Annuler
              </button>
              <button
                onClick={submitForecast}
                disabled={submitLoading || !formData.marque_id || !formData.modele_id}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold shadow hover:from-amber-600 hover:to-yellow-700 disabled:opacity-60"
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
