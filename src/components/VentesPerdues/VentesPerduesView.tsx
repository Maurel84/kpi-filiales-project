import { useEffect, useMemo, useState } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useFilialeContext } from '../../contexts/FilialeContext';
import { ModalTabs } from '../ui/ModalTabs';
import { useListeReference } from '../../hooks/useListeReference';

type LostSale = {
  id: string;
  filiale_id: string;
  a_participe: boolean | null;
  marque_concurrent: string | null;
  modele_concurrent: string | null;
  prix_concurrent: number | null;
  commentaires: string | null;
  created_at: string;
};

export function VentesPerduesView() {
  const { profile } = useAuth();
  const { filialeId, isAdmin } = useFilialeContext();
  const { marques, modeles, modeleLookup } = useListeReference();
  const marqueListId = 'ventes-perdues-marques';
  const modeleListId = 'ventes-perdues-modeles';
  const [items, setItems] = useState<LostSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'concurrence' | 'notes'>('concurrence');
  const showAllTabs = true;
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    a_participe: true,
    marque_concurrent: '',
    modele_concurrent: '',
    prix_concurrent: '',
    commentaires: '',
  });

  const marqueOptions = useMemo(
    () => marques.map((marque) => marque.nom).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [marques]
  );

  const modeleOptions = useMemo(() => {
    const trimmed = formData.marque_concurrent?.trim().toLowerCase();
    const filtered = trimmed
      ? modeles.filter((modele) => modele.marque?.toLowerCase() === trimmed)
      : modeles;
    return filtered.map((modele) => modele.label).filter(Boolean);
  }, [formData.marque_concurrent, modeles]);

  const handleModeleChange = (value: string) => {
    const trimmed = value.trim();
    const match = trimmed ? modeleLookup.get(trimmed.toLowerCase()) : undefined;
    setFormData((prev) => ({
      ...prev,
      modele_concurrent: value,
      marque_concurrent: match?.marque ?? prev.marque_concurrent,
    }));
  };

  useEffect(() => {
    const load = async () => {
      if (!profile) return;

      const query = supabase
        .from('ventes_perdues')
        .select('id, filiale_id, a_participe, marque_concurrent, modele_concurrent, prix_concurrent, commentaires, created_at')
        .order('created_at', { ascending: false });

      if (!isAdmin && !filialeId) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data, error } = filialeId ? await query.eq('filiale_id', filialeId) : await query;
      if (!error && data) setItems(data as LostSale[]);
      setLoading(false);
    };
    load();
  }, [filialeId, isAdmin, profile]);

  useEffect(() => {
    if (isModalOpen) {
      setActiveTab('concurrence');
    }
  }, [isModalOpen]);

  const submit = async () => {
    if (!profile) return;
    if (!filialeId) {
      setSubmitError('Aucune filiale associee au profil. Merci de renseigner la filiale.');
      return;
    }
    if (!formData.marque_concurrent && !formData.commentaires) {
      setSubmitError('Renseignez au moins la marque concurrente ou un commentaire.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);

    const payload = {
      a_participe: formData.a_participe,
      marque_concurrent: formData.marque_concurrent || null,
      modele_concurrent: formData.modele_concurrent || null,
      prix_concurrent: formData.prix_concurrent === '' ? null : Number(formData.prix_concurrent),
      commentaires: formData.commentaires || null,
      filiale_id: filialeId,
      created_by: profile.id,
    };

    const { error } = await supabase.from('ventes_perdues').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    setIsModalOpen(false);
    setSubmitLoading(false);
    setFormData({
      a_participe: true,
      marque_concurrent: '',
      modele_concurrent: '',
      prix_concurrent: '',
      commentaires: '',
    });

    const refreshQuery = supabase
      .from('ventes_perdues')
      .select('id, filiale_id, a_participe, marque_concurrent, modele_concurrent, prix_concurrent, commentaires, created_at')
      .order('created_at', { ascending: false });
    const { data } = filialeId ? await refreshQuery.eq('filiale_id', filialeId) : await refreshQuery;
    if (data) setItems(data as LostSale[]);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Ventes Perdues</h1>
          <p className="text-slate-600">Suivi des ventes perdues et analyse concurrence.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white px-5 py-2.5 rounded-lg shadow hover:from-rose-600 hover:to-orange-600"
        >
          <Plus className="w-5 h-5" />
          <span>Declarer une perte</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Participation</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Marque concurrence</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Modele concurrence</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Prix concurrence</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Commentaires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {item.a_participe === null ? 'N/A' : item.a_participe ? 'Participe' : 'Non participe'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">{item.marque_concurrent || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{item.modele_concurrent || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {item.prix_concurrent ? `${item.prix_concurrent.toLocaleString()} XAF` : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 max-w-xs">
                    {item.commentaires || 'N/A'}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-slate-500 text-sm" colSpan={6}>
                    Aucune vente perdue enregistree.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Declarer une vente perdue</h2>
            {!showAllTabs && (
              <ModalTabs
                tabs={[
                  { id: 'concurrence', label: 'Concurrence' },
                  { id: 'notes', label: 'Notes' },
                ]}
                activeTab={activeTab}
                onChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
              />
            )}

            {(showAllTabs || activeTab === 'concurrence') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Participation</label>
                  <div className="flex items-center gap-4 rounded-lg border border-slate-200 px-3 py-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        checked={formData.a_participe === true}
                        onChange={() => setFormData({ ...formData, a_participe: true })}
                      />
                      Participe
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        checked={formData.a_participe === false}
                        onChange={() => setFormData({ ...formData, a_participe: false })}
                      />
                      Non participe
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Marque concurrence</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    list={marqueListId}
                    value={formData.marque_concurrent}
                    onChange={(e) => setFormData({ ...formData, marque_concurrent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Modele concurrence</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    list={modeleListId}
                    value={formData.modele_concurrent}
                    onChange={(e) => handleModeleChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Prix concurrence</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    value={formData.prix_concurrent}
                    onChange={(e) => setFormData({ ...formData, prix_concurrent: e.target.value })}
                  />
                </div>
              </div>
            )}

            {(showAllTabs || activeTab === 'notes') && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Commentaires</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  value={formData.commentaires}
                  onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
                />
              </div>
            )}

            <datalist id={marqueListId}>
              {marqueOptions.map((marque) => (
                <option key={marque} value={marque} />
              ))}
            </datalist>
            <datalist id={modeleListId}>
              {modeleOptions.map((modele) => (
                <option key={modele} value={modele} />
              ))}
            </datalist>

            {submitError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{submitError}</span>
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
                disabled={submitLoading}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold shadow hover:from-rose-600 hover:to-orange-600 disabled:opacity-60"
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





