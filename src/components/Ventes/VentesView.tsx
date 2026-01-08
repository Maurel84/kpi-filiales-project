import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFilialeContext } from '../../contexts/FilialeContext';
import { supabase } from '../../lib/supabase';
import { Plus, Search, TrendingUp, Download, X } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { ModalTabs } from '../ui/ModalTabs';
import { useListeReference } from '../../hooks/useListeReference';

type VenteRow = Database['public']['Tables']['ventes']['Row'];

type VenteInsert = Database['public']['Tables']['ventes']['Insert'];

type VenteForm = Omit<VenteInsert, 'filiale_id' | 'created_by'> & {
  filiale_id: string | null;
  created_by: string | null;
};

export function VentesView() {
  const { profile } = useAuth();
  const { filialeId, isAdmin } = useFilialeContext();
  const { modeles, modeleLookup, marques, categories, pays, vendeurs } = useListeReference();
  const modeleListId = 'ventes-modeles';
  const marqueListId = 'ventes-marques';
  const gammeListId = 'ventes-gammes';
  const paysListId = 'ventes-pays';
  const vendeursListId = 'ventes-vendeurs';
  const [ventes, setVentes] = useState<VenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'client' | 'produit' | 'finances'>('client');
  const showAllTabs = true;
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState<VenteForm>({
    date_vente: new Date().toISOString().slice(0, 10),
    client_nom: '',
    marque: '',
    modele: '',
    numero_serie: '',
    gamme: '',
    pays: '',
    vendeur: '',
    ca_ht: 0,
    src: '',
    filiale_id: null,
    created_by: null,
  });

  const marqueOptions = useMemo(
    () => marques.map((marque) => marque.nom).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [marques]
  );

  const selectedMarqueId = useMemo(() => {
    const trimmed = formData.marque?.trim().toLowerCase();
    if (!trimmed) return null;
    return marques.find((marque) => marque.nom?.toLowerCase() === trimmed)?.id ?? null;
  }, [formData.marque, marques]);

  const gammeOptions = useMemo(() => {
    const filtered = selectedMarqueId
      ? categories.filter((categorie) => categorie.marque_id === selectedMarqueId)
      : categories;
    return filtered
      .map((categorie) => categorie.nom)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [categories, selectedMarqueId]);

  const modeleOptions = useMemo(() => {
    const trimmed = formData.marque?.trim().toLowerCase();
    const filtered = trimmed
      ? modeles.filter((modele) => modele.marque?.toLowerCase() === trimmed)
      : modeles;
    return Array.from(new Set(filtered.map((modele) => modele.label).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [formData.marque, modeles]);

  const loadVentes = useCallback(async () => {
    if (!profile) return;

    let query = supabase
      .from('ventes')
      .select('id, filiale_id, date_vente, client_nom, marque, modele, numero_serie, gamme, pays, vendeur, ca_ht, src')
      .order('date_vente', { ascending: false });

    if (filialeId) {
      query = query.eq('filiale_id', filialeId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setVentes(data as VenteRow[]);
    }
    setLoading(false);
  }, [filialeId, profile]);

  useEffect(() => {
    loadVentes();
  }, [loadVentes]);

  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      ...prev,
      filiale_id: filialeId || null,
      created_by: profile.id,
    }));
  }, [filialeId, profile]);

  useEffect(() => {
    if (isModalOpen) {
      setActiveTab('client');
    }
  }, [isModalOpen]);

  const handleModeleChange = (value: string) => {
    const trimmed = value.trim();
    const match = trimmed ? modeleLookup.get(trimmed.toLowerCase()) : undefined;
    setFormData((prev) => ({
      ...prev,
      modele: value,
      marque: match?.marque ?? prev.marque,
      gamme: match?.gamme ?? prev.gamme,
    }));
  };

  const submitVente = async () => {
    if (!profile) return;
    if (!formData.client_nom || !formData.marque || !formData.modele) {
      setSubmitError('Client, marque et modele sont requis.');
      return;
    }
    if (!filialeId) {
      setSubmitError(isAdmin ? 'Selectionnez une filiale active pour enregistrer une vente.' : 'Filiale requise pour enregistrer une vente.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);

    const payload: VenteInsert = {
      date_vente: formData.date_vente,
      client_nom: formData.client_nom,
      marque: formData.marque || null,
      modele: formData.modele || null,
      numero_serie: formData.numero_serie || null,
      gamme: formData.gamme || null,
      pays: formData.pays || null,
      vendeur: formData.vendeur || null,
      ca_ht: Number(formData.ca_ht) || 0,
      src: formData.src || null,
      filiale_id: filialeId,
      created_by: profile.id,
    };

    const { error } = await supabase.from('ventes').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }

    setSubmitLoading(false);
    setIsModalOpen(false);
    setFormData({
      date_vente: new Date().toISOString().slice(0, 10),
      client_nom: '',
      marque: '',
      modele: '',
      numero_serie: '',
      gamme: '',
      pays: '',
      vendeur: '',
      ca_ht: 0,
      src: '',
      filiale_id: filialeId,
      created_by: profile.id,
    });
    loadVentes();
  };

  const filteredVentes = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return ventes.filter((vente) =>
      [
        vente.client_nom,
        vente.marque || '',
        vente.modele || '',
        vente.numero_serie || '',
        vente.gamme || '',
        vente.pays || '',
        vente.vendeur || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [ventes, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Ventes</h1>
          <p className="text-slate-600">
            ETAT DES VENTES : Date, Client, Marque, Modele, S/N, Gamme, Pays, Vendeur, CA HT, SRC
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-6 py-3 rounded-lg hover:from-amber-600 hover:to-yellow-700 transition shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Nouvelle vente</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par client, marque ou modele..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <button className="flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
            <Download className="w-5 h-5" />
            <span>Exporter</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Marque</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Modele</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">S/N</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Gamme</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Pays</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Vendeur</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">CA HT</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">SRC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredVentes.map((vente) => (
                <tr key={vente.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(vente.date_vente).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900">{vente.client_nom}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{vente.marque || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{vente.modele || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{vente.numero_serie || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{vente.gamme || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{vente.pays || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{vente.vendeur || '-'}</td>
                  <td className="py-3 px-4 text-sm text-right text-slate-900">
                    {(vente.ca_ht || 0).toLocaleString()} XAF
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">{vente.src || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredVentes.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Aucune vente trouvee</p>
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

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Nouvelle vente</h2>
            {!showAllTabs && (
              <ModalTabs
                tabs={[
                  { id: 'client', label: 'Client' },
                  { id: 'produit', label: 'Produit' },
                  { id: 'finances', label: 'Finances' },
                ]}
                activeTab={activeTab}
                onChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
              />
            )}

            {(showAllTabs || activeTab === 'client') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    value={formData.date_vente}
                    onChange={(e) => setFormData({ ...formData, date_vente: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Client</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    value={formData.client_nom}
                    onChange={(e) => setFormData({ ...formData, client_nom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Vendeur</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    list={vendeursListId}
                    value={formData.vendeur || ''}
                    onChange={(e) => setFormData({ ...formData, vendeur: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Pays</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    list={paysListId}
                    value={formData.pays || ''}
                    onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                  />
                </div>
              </div>
            )}

            {(showAllTabs || activeTab === 'produit') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Marque</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    list={marqueListId}
                    value={formData.marque ?? ''}
                    onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Modele</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    list={modeleListId}
                    value={formData.modele ?? ''}
                    onChange={(e) => handleModeleChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">S/N</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    value={formData.numero_serie || ''}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Gamme</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    list={gammeListId}
                    value={formData.gamme || ''}
                    onChange={(e) => setFormData({ ...formData, gamme: e.target.value })}
                  />
                </div>
              </div>
            )}

            {(showAllTabs || activeTab === 'finances') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">CA HT</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    value={formData.ca_ht}
                    onChange={(e) => setFormData({ ...formData, ca_ht: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">SRC</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    value={formData.src || ''}
                    onChange={(e) => setFormData({ ...formData, src: e.target.value })}
                  />
                </div>
              </div>
            )}

            <datalist id={modeleListId}>
              {modeleOptions.map((modele) => (
                <option key={modele} value={modele} />
              ))}
            </datalist>
            <datalist id={marqueListId}>
              {marqueOptions.map((marque) => (
                <option key={marque} value={marque} />
              ))}
            </datalist>
            <datalist id={gammeListId}>
              {gammeOptions.map((gamme) => (
                <option key={gamme} value={gamme} />
              ))}
            </datalist>
            <datalist id={paysListId}>
              {pays.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id={vendeursListId}>
              {vendeurs.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>

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
                onClick={submitVente}
                disabled={submitLoading || !formData.client_nom || !formData.marque || !formData.modele}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold shadow hover:from-amber-600 hover:to-yellow-700 disabled:opacity-60"
              >
                {submitLoading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





