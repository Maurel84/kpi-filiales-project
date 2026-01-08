import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Filter, Plus, TrendingUp, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFilialeContext } from '../../contexts/FilialeContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { ModalTabs } from '../ui/ModalTabs';
import { useListeReference } from '../../hooks/useListeReference';

type PdmInsert = Database['public']['Tables']['pdm_entries']['Insert'];
type SourceType = NonNullable<PdmInsert['source_industrie_type']>;
type PdmForm = {
  marque: string;
  categorie: string;
  industrie: string;
  src: string;
  source_industrie_type: SourceType | '';
  annee: number;
};

type PDMEntryRow = {
  id: string;
  filiale_id: string | null;
  marque: string | null;
  categorie: string | null;
  industrie: number | null;
  src: number | null;
  source_industrie_type: string | null;
  annee: number | null;
};

const SOURCE_OPTIONS: SourceType[] = ['AEM TABLE', 'WITS Shipment', 'WITS Order'];

const COLUMN_GUIDE = [
  {
    label: 'Categorie',
    description: 'Segment de produit (famille ou classe).',
  },
  {
    label: 'Industrie',
    description: 'Volume estime du marche total pour la categorie.',
  },
  {
    label: 'SRC',
    description: 'Volume interne estime (source SRC).',
  },
  {
    label: 'Source industrie',
    description: 'Origine du chiffre Industrie: AEM Table, WITS Shipment ou WITS Order.',
  },
];

const SOURCE_GUIDE = [
  {
    label: 'AEM TABLE',
    description: 'Donnees de l\'Association of Equipment Manufacturers.',
  },
  {
    label: 'WITS Shipment',
    description: 'Donnees WITS basees sur les expeditions effectives.',
  },
  {
    label: 'WITS Order',
    description: 'Donnees WITS basees sur les commandes.',
  },
];

const defaultForm: PdmForm = {
  marque: '',
  categorie: '',
  industrie: '',
  src: '',
  source_industrie_type: '',
  annee: 2026,
};

export function PDMView() {
  const { profile } = useAuth();
  const { filialeId, isAdmin } = useFilialeContext();
  const { marques, categories, loading: referenceLoading } = useListeReference();
  const [pdmEntries, setPdmEntries] = useState<PDMEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarque, setSelectedMarque] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'categorie' | 'sources'>('categorie');
  const showAllTabs = true;
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState<PdmForm>(defaultForm);
  const [showColumnGuide, setShowColumnGuide] = useState(true);
  const [showCategoryGuide, setShowCategoryGuide] = useState(true);

  const marqueOptions = useMemo(
    () => marques.map((marque) => marque.nom).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [marques]
  );

  const selectedMarqueId = useMemo(() => {
    const trimmed = formData.marque?.trim().toLowerCase();
    if (!trimmed) return null;
    return marques.find((marque) => marque.nom?.toLowerCase() === trimmed)?.id ?? null;
  }, [formData.marque, marques]);

  const categorieOptions = useMemo(() => {
    const filtered = selectedMarqueId
      ? categories.filter((categorie) => categorie.marque_id === selectedMarqueId)
      : categories;
    return filtered
      .map((categorie) => categorie.nom)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [categories, selectedMarqueId]);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    let query = supabase
      .from('pdm_entries')
      .select('id, filiale_id, marque, categorie, industrie, src, source_industrie_type, annee')
      .eq('annee', selectedYear)
      .order('marque', { ascending: true })
      .order('categorie', { ascending: true });

    if (filialeId) {
      query = query.eq('filiale_id', filialeId);
    }

    if (selectedMarque !== 'all') {
      query = query.eq('marque', selectedMarque);
    }

    const { data, error } = await query;

    if (!error && data) {
      setPdmEntries(data as PDMEntryRow[]);
    }

    setLoading(false);
  }, [filialeId, profile, selectedMarque, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, annee: selectedYear }));
  }, [selectedYear]);

  useEffect(() => {
    if (isModalOpen) {
      setActiveTab('categorie');
    }
  }, [isModalOpen]);

  const submitPdmEntry = async () => {
    if (!profile) return;
    if (!filialeId) {
      setSubmitError(
        isAdmin
          ? 'Selectionnez une filiale active pour saisir une PDM.'
          : 'Associez une filiale pour saisir une PDM.'
      );
      return;
    }
    const marque = formData.marque.trim();
    const categorie = formData.categorie.trim();
    if (!marque || !categorie) {
      setSubmitError('Marque et categorie sont obligatoires.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);

    const industrieValue = formData.industrie === '' ? null : Number(formData.industrie);
    if (formData.industrie !== '' && Number.isNaN(industrieValue)) {
      setSubmitError('Industrie doit etre un nombre.');
      setSubmitLoading(false);
      return;
    }

    const srcValue = formData.src === '' ? null : Number(formData.src);
    if (formData.src !== '' && Number.isNaN(srcValue)) {
      setSubmitError('SRC doit etre un nombre.');
      setSubmitLoading(false);
      return;
    }

    const sourceType: PdmInsert['source_industrie_type'] =
      formData.source_industrie_type === '' ? null : formData.source_industrie_type;
    const payload: PdmInsert = {
      marque,
      categorie,
      annee: Number(formData.annee),
      industrie: industrieValue,
      src: srcValue,
      source_industrie_type: sourceType,
      filiale_id: filialeId || null,
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

  const totalIndustrie = useMemo(
    () => pdmEntries.reduce((sum, entry) => sum + (entry.industrie || 0), 0),
    [pdmEntries]
  );

  const totalSrc = useMemo(() => pdmEntries.reduce((sum, entry) => sum + (entry.src || 0), 0), [pdmEntries]);

  const uniqueMarques = useMemo(() => {
    const values = new Set<string>();
    pdmEntries.forEach((entry) => {
      if (entry.marque) values.add(entry.marque);
    });
    return Array.from(values);
  }, [pdmEntries]);

  const guideMarques = useMemo(() => {
    const marqueMap = new Map<string, string>();
    marques.forEach((marque) => {
      if (marque.id && marque.nom) marqueMap.set(marque.id, marque.nom);
    });
    const groups = new Map<string, string[]>();
    categories.forEach((categorie) => {
      if (!categorie.marque_id || !categorie.nom) return;
      const marqueNom = marqueMap.get(categorie.marque_id);
      if (!marqueNom) return;
      const list = groups.get(marqueNom) ?? [];
      list.push(categorie.nom);
      groups.set(marqueNom, list);
    });
    return Array.from(groups.entries())
      .map(([marque, items]) => [marque, Array.from(new Set(items)).sort((a, b) => a.localeCompare(b))] as [
        string,
        string[],
      ])
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [categories, marques]);

  if (loading || referenceLoading) {
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Part de marche (PDM)</h1>
            <p className="text-slate-600">Categories, industrie, SRC et source des donnees</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-5 py-2.5 rounded-lg shadow hover:from-amber-600 hover:to-yellow-700"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter une part de marche</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Total industrie {selectedYear}</p>
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalIndustrie.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">valeur</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Total SRC {selectedYear}</p>
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalSrc.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">valeur</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Entrees part de marche</p>
              <Filter className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{pdmEntries.length}</p>
            <p className="text-sm text-slate-500 mt-1">Marques: {uniqueMarques.join(', ') || '-'}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Plans par categorie</h2>
            <div className="flex items-center space-x-3">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={selectedMarque}
                onChange={(e) => setSelectedMarque(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="all">Toutes les marques</option>
                {marqueOptions.map((nom) => (
                  <option key={nom} value={nom}>
                    {nom}
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Categorie</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Source industrie</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Industrie</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">SRC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pdmEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition">
                    <td className="py-4 px-4">
                      <span className="font-medium text-slate-900">{entry.marque || '-'}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-900">{entry.categorie || '-'}</td>
                    <td className="py-4 px-4 text-sm text-slate-600">{entry.source_industrie_type || '-'}</td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-semibold text-slate-900">
                        {(entry.industrie ?? null) !== null ? entry.industrie?.toLocaleString() : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-semibold text-slate-900">
                        {(entry.src ?? null) !== null ? entry.src?.toLocaleString() : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pdmEntries.length === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Aucune part de marche pour {selectedYear}</p>
                <p className="text-sm text-slate-500 mt-2">Ajoutez les categories et sources pour demarrer</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Guide des colonnes PDM</h2>
              <button
                onClick={() => setShowColumnGuide((prev) => !prev)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700"
                aria-expanded={showColumnGuide}
              >
                {showColumnGuide ? 'Masquer' : 'Afficher'}
                {showColumnGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            {showColumnGuide && (
              <>
                <div className="space-y-3">
                  {COLUMN_GUIDE.map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <span className="text-sm font-semibold text-slate-700 min-w-[120px]">{item.label}</span>
                      <p className="text-sm text-slate-600">{item.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                  {SOURCE_GUIDE.map((item) => (
                    <div key={item.label} className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-700">{item.label}:</span> {item.description}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Guide des categories</h2>
              <button
                onClick={() => setShowCategoryGuide((prev) => !prev)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700"
                aria-expanded={showCategoryGuide}
              >
                {showCategoryGuide ? 'Masquer' : 'Afficher'}
                {showCategoryGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            {showCategoryGuide && (
              <div className="space-y-4">
                {guideMarques.map(([marque, items]) => (
                  <div key={marque}>
                    <p className="text-sm font-semibold text-slate-800 mb-2">{marque}</p>
                    <div className="space-y-1">
                      {items.map((item) => (
                        <p key={`${marque}-${item}`} className="text-sm text-slate-600">
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-slate-200 text-xs text-slate-500">
                  Source categories NARDI:&nbsp;
                  <a
                    href="https://nardigroup.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-600 hover:text-amber-700 font-semibold"
                  >
                    nardigroup.com
                  </a>
                  &nbsp;(catalogue des moyens agricoles).
                </div>
              </div>
            )}
          </div>
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

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Ajouter une part de marche</h2>
            {!showAllTabs && (
              <ModalTabs
                tabs={[
                  { id: 'categorie', label: 'Categorie' },
                  { id: 'sources', label: 'Sources' },
                ]}
                activeTab={activeTab}
                onChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
              />
            )}

            {(showAllTabs || activeTab === 'categorie') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Marque</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    value={formData.marque}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        marque: e.target.value,
                        categorie: '',
                      })
                    }
                  >
                    <option value="">Selectionner</option>
                    {marqueOptions.map((nom) => (
                      <option key={nom} value={nom}>
                        {nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Categorie</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                    list="pdm-categories"
                    placeholder="Ex: TELEHANDLERS"
                  />
                  <datalist id="pdm-categories">
                    {categorieOptions.map((categorie) => (
                      <option key={categorie} value={categorie} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Annee</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    value={formData.annee}
                    onChange={(e) => setFormData({ ...formData, annee: Number(e.target.value) })}
                    min={2023}
                    max={2030}
                  />
                </div>
              </div>
            )}

            {(showAllTabs || activeTab === 'sources') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Source industrie</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    value={formData.source_industrie_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        source_industrie_type: e.target.value ? (e.target.value as SourceType) : '',
                      })
                    }
                  >
                    <option value="">Selectionner</option>
                    {SOURCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Industrie</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    value={formData.industrie}
                    onChange={(e) => setFormData({ ...formData, industrie: e.target.value })}
                    min={0}
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">SRC</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    value={formData.src}
                    onChange={(e) => setFormData({ ...formData, src: e.target.value })}
                    min={0}
                    step="0.01"
                  />
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
                onClick={submitPdmEntry}
                disabled={submitLoading || !formData.marque || !formData.categorie}
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





