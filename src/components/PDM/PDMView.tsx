import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BarChart3, Package, TrendingUp, Filter, Plus, X } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Marque = Database['public']['Tables']['marques']['Row'];
type Categorie = Database['public']['Tables']['categories_produits']['Row'];
type Modele = Database['public']['Tables']['modeles_produits']['Row'];

type PDMEntryRow = Database['public']['Tables']['pdm_entries']['Row'] & {
  marques?: { nom: string } | null;
  categories_produits?: { nom: string; type_produit: string | null } | null;
  modeles_produits?: { nom_complet: string; code_modele: string } | null;
};

const defaultForm = {
  marque_id: '',
  categorie_id: '',
  modele_id: '',
  annee: 2026,
  source_industrie: '',
  source_src: '',
  objectif_ventes: 0,
  commentaires: '',
};

export function PDMView() {
  const { profile } = useAuth();
  const [marques, setMarques] = useState<Marque[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [modeles, setModeles] = useState<Modele[]>([]);
  const [pdmEntries, setPdmEntries] = useState<PDMEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarque, setSelectedMarque] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState(defaultForm);

  const loadData = useCallback(async () => {
    if (!profile) return;

    const [{ data: marquesData }, { data: categoriesData }, { data: modelesData }] = await Promise.all([
      supabase.from('marques').select('id, nom').eq('actif', true).order('nom'),
      supabase.from('categories_produits').select('id, nom, type_produit, marque_id').eq('actif', true).order('nom'),
      supabase
        .from('modeles_produits')
        .select('id, nom_complet, code_modele, marque_id, categorie_id, actif')
        .eq('actif', true)
        .order('nom_complet'),
    ]);

    if (marquesData) setMarques(marquesData as Marque[]);
    if (categoriesData) setCategories(categoriesData as Categorie[]);
    if (modelesData) setModeles(modelesData as Modele[]);

    let query = supabase
      .from('pdm_entries')
      .select(
        '*, marques(nom), categories_produits(nom, type_produit), modeles_produits(nom_complet, code_modele)'
      )
      .eq('annee', selectedYear)
      .order('objectif_ventes', { ascending: false });

    if (profile.role !== 'admin_siege' && profile.filiale_id) {
      query = query.eq('filiale_id', profile.filiale_id);
    }

    if (selectedMarque !== 'all') {
      query = query.eq('marque_id', selectedMarque);
    }

    const { data, error } = await query;

    if (!error && data) {
      setPdmEntries(data as unknown as PDMEntryRow[]);
    }

    setLoading(false);
  }, [profile, selectedMarque, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, annee: selectedYear }));
  }, [selectedYear]);

  const submitPdmEntry = async () => {
    if (!profile) return;
    if (!formData.marque_id || !formData.categorie_id) {
      setSubmitError('Marque et catégorie sont obligatoires.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);

    const payload = {
      marque_id: formData.marque_id,
      categorie_id: formData.categorie_id || null,
      modele_id: formData.modele_id || null,
      annee: Number(formData.annee),
      source_industrie: formData.source_industrie.trim() || null,
      source_src: formData.source_src.trim() || null,
      objectif_ventes: Number(formData.objectif_ventes) || 0,
      commentaires: formData.commentaires.trim() || null,
      filiale_id: profile.filiale_id || null,
      created_by: profile.id,
    };

    const { error } = await supabase.from('pdm_entries').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }

    setSubmitLoading(false);
    setIsModalOpen(false);
    setFormData({ ...defaultForm, annee: selectedYear });
    loadData();
  };

  const getTypeProduitBadge = (type: string) => {
    const badges = {
      Chariot: 'bg-blue-100 text-blue-800',
      Telescopique: 'bg-purple-100 text-purple-800',
      Nacelle: 'bg-amber-100 text-amber-800',
      Tracteur: 'bg-green-100 text-green-800',
      Moissonneuse: 'bg-amber-100 text-amber-800',
      Reachstacker: 'bg-red-100 text-red-800',
      Terminal_Tractor: 'bg-slate-100 text-slate-800',
      Autre: 'bg-gray-100 text-gray-800',
    };
    return badges[type as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const totalObjectifs = useMemo(
    () => pdmEntries.reduce((sum, entry) => sum + (entry.objectif_ventes || 0), 0),
    [pdmEntries]
  );

  const byMarque = useMemo(() => {
    return pdmEntries.reduce((acc, entry) => {
      const marque = entry.marques?.nom || 'Autre';
      acc[marque] = (acc[marque] || 0) + (entry.objectif_ventes || 0);
      return acc;
    }, {} as Record<string, number>);
  }, [pdmEntries]);

  const byType = useMemo(() => {
    return pdmEntries.reduce((acc, entry) => {
      const type = entry.categories_produits?.type_produit || 'Autre';
      acc[type] = (acc[type] || 0) + (entry.objectif_ventes || 0);
      return acc;
    }, {} as Record<string, number>);
  }, [pdmEntries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const filteredCategories = categories.filter(
    (categorie) => !formData.marque_id || categorie.marque_id === formData.marque_id
  );
  const filteredModeles = modeles.filter((modele) => {
    if (formData.marque_id && modele.marque_id !== formData.marque_id) return false;
    if (formData.categorie_id && modele.categorie_id !== formData.categorie_id) return false;
    return true;
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Plans de Marché (PDM)</h1>
            <p className="text-slate-600">Objectifs par catégorie, source Industrie/SRC</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-5 py-2.5 rounded-lg shadow hover:from-amber-600 hover:to-yellow-700"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter un PDM</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Objectif total {selectedYear}</p>
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalObjectifs}</p>
            <p className="text-sm text-slate-500 mt-1">unités</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Marques actives</p>
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{Object.keys(byMarque).length}</p>
            <p className="text-sm text-slate-500 mt-1">{Object.keys(byMarque).join(', ')}</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Catégories</p>
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{pdmEntries.length}</p>
            <p className="text-sm text-slate-500 mt-1">entrées PDM</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Objectifs par catégorie</h2>
            <div className="flex items-center space-x-3">
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Catégorie</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Modèle</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Industrie</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">SRC</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Objectif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pdmEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition">
                    <td className="py-4 px-4">
                      <span className="font-medium text-slate-900">{entry.marques?.nom || '-'}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-900">{entry.categories_produits?.nom || '-'}</td>
                    <td className="py-4 px-4">
                      {entry.categories_produits?.type_produit && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeProduitBadge(
                            entry.categories_produits.type_produit
                          )}`}
                        >
                          {entry.categories_produits.type_produit.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-700">
                      {entry.modeles_produits ? (
                        <div>
                          <div className="font-medium text-slate-900">{entry.modeles_produits.nom_complet}</div>
                          <div className="text-xs text-slate-500">{entry.modeles_produits.code_modele}</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600">{entry.source_industrie || '-'}</td>
                    <td className="py-4 px-4 text-sm text-slate-600">{entry.source_src || '-'}</td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-semibold text-slate-900">
                        {(entry.objectif_ventes || 0).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pdmEntries.length === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Aucun plan de marché pour {selectedYear}</p>
                <p className="text-sm text-slate-500 mt-2">
                  Les PDM seront disponibles après configuration des objectifs par marque
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {Object.keys(byType).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Répartition par type de produit</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(byType).map(([type, total]) => (
              <div key={type} className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">{type.replace('_', ' ')}</p>
                <p className="text-2xl font-bold text-slate-900">{total}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {totalObjectifs ? ((total / totalObjectifs) * 100).toFixed(1) : 0}% du total
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Ajouter un plan de marché</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Marque</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.marque_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      marque_id: e.target.value,
                      categorie_id: '',
                      modele_id: '',
                    })
                  }
                >
                  <option value="">Sélectionner</option>
                  {marques.map((marque) => (
                    <option key={marque.id} value={marque.id}>
                      {marque.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Catégorie</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.categorie_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      categorie_id: e.target.value,
                      modele_id: '',
                    })
                  }
                >
                  <option value="">Sélectionner</option>
                  {filteredCategories.map((categorie) => (
                    <option key={categorie.id} value={categorie.id}>
                      {categorie.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Modèle (optionnel)</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.modele_id}
                  onChange={(e) => setFormData({ ...formData, modele_id: e.target.value })}
                >
                  <option value="">Sélectionner</option>
                  {filteredModeles.map((modele) => (
                    <option key={modele.id} value={modele.id}>
                      {modele.nom_complet} ({modele.code_modele})
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
                <label className="text-sm font-medium text-slate-700">Source industrie</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.source_industrie}
                  onChange={(e) => setFormData({ ...formData, source_industrie: e.target.value })}
                  placeholder="Ex: Industrie locale"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Source SRC</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.source_src}
                  onChange={(e) => setFormData({ ...formData, source_src: e.target.value })}
                  placeholder="Ex: SRC interne"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Objectif ventes</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.objectif_ventes}
                  onChange={(e) => setFormData({ ...formData, objectif_ventes: Number(e.target.value) })}
                  min={0}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Commentaires</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  rows={3}
                  value={formData.commentaires}
                  onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
                />
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
                onClick={submitPdmEntry}
                disabled={submitLoading || !formData.marque_id || !formData.categorie_id}
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
