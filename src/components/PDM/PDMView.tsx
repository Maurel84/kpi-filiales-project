import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Filter, Plus, TrendingUp, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type Marque = { id: string; nom: string };

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

const SOURCE_OPTIONS = ['AEM TABLE', 'WITS Shipment', 'WITS Order'];

const CATEGORY_BY_MARQUE: Record<string, string[]> = {
  KALMAR: ['FLT', 'RST', 'ECH', 'TT', 'STRADDLE'],
  MANITOU: [
    'MEWP',
    'R.T. FORKLIFTS',
    'TELEHANDLERS',
    'Class 1 - Electric Cb. Rider Trucks',
    'Class 2 - Electric Warehouse Rider Trucks',
    'Class 3 - Electric Warehouse Pedestrian Trucks',
    'Class 4 & 5 - IC Cb. Trucks',
  ],
  'MASSEY FERGUSON': [
    '0 a 49cv',
    '50 a 69cv',
    '70 a 89cv',
    '90 a 109cv',
    '110 a 129cv',
    '130 a 149cv',
    '150 a 169cv',
    '170 a 199cv',
    '200 a 249cv',
    '340+ cv',
    'Class 3',
    'Class 4',
    'Class 5',
    'Class 6',
    'Class 7',
    'Class 8',
    'Simple',
    'Double',
    'TRACTEUR',
    'HARVESTER COMBINE',
    'BALER',
  ],
  NARDI: [],
};

const CATEGORY_DEFINITIONS: Record<string, { label: string; description: string }[]> = {
  KALMAR: [
    { label: 'FLT', description: 'Fork Lift Truck (chariots elevateurs lourds).' },
    { label: 'RST', description: 'Reach Stacker (manutention de conteneurs).' },
    { label: 'ECH', description: 'Empty Container Handler (manutention de conteneurs vides).' },
    { label: 'TT', description: 'Terminal Tractor (tracteur de terminal portuaire).' },
    { label: 'STRADDLE', description: 'Straddle Carrier (cavalier portuaire).' },
  ],
  MANITOU: [
    { label: 'MEWP', description: 'Mobile Elevating Work Platform (nacelles elevatrices).' },
    { label: 'R.T. FORKLIFTS', description: 'Rough Terrain Forklifts (chariots tout-terrain).' },
    { label: 'TELEHANDLERS', description: 'Chariots telescopiques.' },
    {
      label: 'Class 1 - Electric Cb. Rider Trucks',
      description: 'Chariots electriques a conducteur assis.',
    },
    {
      label: 'Class 2 - Electric Warehouse Rider Trucks',
      description: 'Chariots electriques d\'entrepot a conducteur.',
    },
    {
      label: 'Class 3 - Electric Warehouse Pedestrian Trucks',
      description: 'Chariots electriques d\'entrepot a conducteur accompagnant.',
    },
    {
      label: 'Class 4 & 5 - IC Cb. Trucks',
      description: 'Chariots thermiques contrepoids.',
    },
  ],
  'MASSEY FERGUSON': [
    { label: '0 a 49cv', description: 'Tracteurs, puissance de 0 a 49 cv.' },
    { label: '50 a 69cv', description: 'Tracteurs, puissance de 50 a 69 cv.' },
    { label: '70 a 89cv', description: 'Tracteurs, puissance de 70 a 89 cv.' },
    { label: '90 a 109cv', description: 'Tracteurs, puissance de 90 a 109 cv.' },
    { label: '110 a 129cv', description: 'Tracteurs, puissance de 110 a 129 cv.' },
    { label: '130 a 149cv', description: 'Tracteurs, puissance de 130 a 149 cv.' },
    { label: '150 a 169cv', description: 'Tracteurs, puissance de 150 a 169 cv.' },
    { label: '170 a 199cv', description: 'Tracteurs, puissance de 170 a 199 cv.' },
    { label: '200 a 249cv', description: 'Tracteurs, puissance de 200 a 249 cv.' },
    { label: '340+ cv', description: 'Tracteurs, puissance superieure a 340 cv.' },
    { label: 'Class 3', description: 'Moissonneuses-batteuses, classe 3.' },
    { label: 'Class 4', description: 'Moissonneuses-batteuses, classe 4.' },
    { label: 'Class 5', description: 'Moissonneuses-batteuses, classe 5.' },
    { label: 'Class 6', description: 'Moissonneuses-batteuses, classe 6.' },
    { label: 'Class 7', description: 'Moissonneuses-batteuses, classe 7.' },
    { label: 'Class 8', description: 'Moissonneuses-batteuses, classe 8.' },
    { label: 'Simple', description: 'Presses a balles, chambre simple.' },
    { label: 'Double', description: 'Presses a balles, chambre double.' },
    { label: 'TRACTEUR', description: 'Tracteurs agricoles.' },
    { label: 'HARVESTER COMBINE', description: 'Moissonneuses-batteuses.' },
    { label: 'BALER', description: 'Presses a balles.' },
  ],
  NARDI: [
    {
      label: 'A definir',
      description: 'Categories NARDI non confirmees. Merci de fournir la liste officielle.',
    },
  ],
};

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

const normalizeMarque = (value: string) => value.trim().toUpperCase();

const defaultForm = {
  marque: '',
  categorie: '',
  industrie: '',
  src: '',
  source_industrie_type: '',
  annee: 2026,
};

export function PDMView() {
  const { profile } = useAuth();
  const [marques, setMarques] = useState<Marque[]>([]);
  const [pdmEntries, setPdmEntries] = useState<PDMEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarque, setSelectedMarque] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState(defaultForm);
  const [showColumnGuide, setShowColumnGuide] = useState(true);
  const [showCategoryGuide, setShowCategoryGuide] = useState(true);

  const marqueOptions = useMemo(() => {
    const options = marques.map((marque) => marque.nom).filter(Boolean);
    if (!options.some((option) => normalizeMarque(option) === 'NARDI')) {
      options.push('NARDI');
    }
    return options.sort((a, b) => a.localeCompare(b));
  }, [marques]);

  const categorieOptions = useMemo(() => {
    if (!formData.marque) return [];
    return CATEGORY_BY_MARQUE[normalizeMarque(formData.marque)] || [];
  }, [formData.marque]);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const { data: marquesData } = await supabase.from('marques').select('id, nom').eq('actif', true).order('nom');
    if (marquesData) setMarques(marquesData as Marque[]);

    let query = supabase
      .from('pdm_entries')
      .select('id, filiale_id, marque, categorie, industrie, src, source_industrie_type, annee')
      .eq('annee', selectedYear)
      .order('marque', { ascending: true })
      .order('categorie', { ascending: true });

    if (profile.role !== 'admin_siege' && profile.filiale_id) {
      query = query.eq('filiale_id', profile.filiale_id);
    }

    if (selectedMarque !== 'all') {
      query = query.eq('marque', selectedMarque);
    }

    const { data, error } = await query;

    if (!error && data) {
      setPdmEntries(data as PDMEntryRow[]);
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

    const payload = {
      marque,
      categorie,
      annee: Number(formData.annee),
      industrie: industrieValue,
      src: srcValue,
      source_industrie_type: formData.source_industrie_type || null,
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

  const guideMarques = useMemo(
    () =>
      Object.entries(CATEGORY_DEFINITIONS).filter(([, items]) => items.length > 0) as [
        string,
        { label: string; description: string }[],
      ][],
    []
  );

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
                        <p key={`${marque}-${item.label}`} className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-700">{item.label}:</span> {item.description}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Ajouter une part de marche</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Source industrie</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  value={formData.source_industrie_type}
                  onChange={(e) => setFormData({ ...formData, source_industrie_type: e.target.value })}
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
