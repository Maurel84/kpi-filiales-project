import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFilialeContext } from '../../contexts/FilialeContext';
import { supabase } from '../../lib/supabase';
import { Truck, Package, Calendar, TrendingUp, Search, AlertTriangle, X } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { ModalTabs } from '../ui/ModalTabs';
import { useListeReference } from '../../hooks/useListeReference';

interface CommandeFournisseur {
  id: string;
  numero_commande: string;
  filiale_id: string;
  date_commande: string;
  marque: string | null;
  modele: string | null;
  gamme: string | null;
  prix_achat_ht: number | null;
  eta: string | null;
}

type CommandeInsert = Database['public']['Tables']['commandes_fournisseurs']['Insert'];
type CommandeForm = Omit<CommandeInsert, 'filiale_id' | 'created_by'> & {
  filiale_id: string | null;
  created_by: string | null;
};

const defaultForm: CommandeForm = {
  numero_commande: '',
  date_commande: new Date().toISOString().slice(0, 10),
  marque: '',
  modele: '',
  gamme: '',
  prix_achat_ht: null,
  eta: '',
  filiale_id: null,
  created_by: null,
};

export function CommandesFournisseursView() {
  const { profile } = useAuth();
  const { filialeId, isAdmin } = useFilialeContext();
  const { modeles, modeleLookup, marques, categories } = useListeReference();
  const modeleListId = 'commandes-fournisseurs-modeles';
  const marqueListId = 'commandes-fournisseurs-marques';
  const gammeListId = 'commandes-fournisseurs-gammes';
  const [commandes, setCommandes] = useState<CommandeFournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'commande' | 'produit' | 'finances'>('commande');
  const showAllTabs = true;
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState<CommandeForm>(defaultForm);

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

  const loadCommandes = useCallback(async () => {
    if (!profile) return;

    if (!isAdmin && !filialeId) {
      setCommandes([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('commandes_fournisseurs')
      .select('id, numero_commande, filiale_id, date_commande, marque, modele, gamme, prix_achat_ht, eta')
      .order('date_commande', { ascending: false });

    if (filialeId) {
      query = query.eq('filiale_id', filialeId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setCommandes(data as CommandeFournisseur[]);
    }
    setLoading(false);
  }, [filialeId, isAdmin, profile]);

  useEffect(() => {
    loadCommandes();
  }, [loadCommandes]);

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
      setActiveTab('commande');
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

  const submitCommande = async () => {
    if (!profile) return;
    if (!filialeId) {
      setSubmitError(
        isAdmin
          ? 'Selectionnez une filiale active pour creer une commande.'
          : 'Associez une filiale pour creer une commande.'
      );
      return;
    }

    if (!formData.numero_commande || !formData.marque) {
      setSubmitError('Numero de commande et marque requis.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);
    const payload: CommandeInsert = {
      numero_commande: formData.numero_commande,
      date_commande: formData.date_commande,
      marque: formData.marque || null,
      modele: formData.modele || null,
      gamme: formData.gamme || null,
      prix_achat_ht: formData.prix_achat_ht === null ? null : Number(formData.prix_achat_ht),
      eta: formData.eta || null,
      filiale_id: filialeId,
      created_by: profile.id,
    };
    const { error } = await supabase.from('commandes_fournisseurs').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    setSubmitLoading(false);
    setIsModalOpen(false);
    setFormData({
      ...defaultForm,
      filiale_id: filialeId || null,
      created_by: profile.id,
    });
    loadCommandes();
  };

  const filteredCommandes = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return commandes.filter((cmd) =>
      [
        cmd.numero_commande,
        cmd.marque || '',
        cmd.modele || '',
        cmd.gamme || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [commandes, searchTerm]);

  const totalAchat = filteredCommandes.reduce((sum, cmd) => sum + (cmd.prix_achat_ht || 0), 0);
  const commandesSansEta = filteredCommandes.filter((c) => !c.eta).length;
  const commandesSansPrix = filteredCommandes.filter((c) => c.prix_achat_ht === null).length;
  const today = new Date();
  const commandesEtaRetard = filteredCommandes.filter((c) => c.eta && new Date(c.eta) < today).length;

  const isEtaOverdue = (eta: string | null) => {
    if (!eta) return false;
    return new Date(eta) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Commandes Fournisseurs</h1>
          <p className="text-slate-600">
            Etat CF : Date, Numero, Marque, Modele, Gamme, Prix achat HT, ETA
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition shadow-lg hover:shadow-xl"
        >
          <Truck className="w-5 h-5" />
          <span className="font-medium">Nouvelle commande</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Total commandes</p>
            <Truck className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{filteredCommandes.length}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Sans ETA</p>
            <Calendar className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{commandesSansEta}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">ETA en retard</p>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{commandesEtaRetard}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Total achats</p>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {totalAchat.toLocaleString()} <span className="text-sm text-slate-500">XAF</span>
          </p>
          {commandesSansPrix > 0 && (
            <p className="mt-1 text-xs text-amber-600">{commandesSansPrix} commande(s) sans prix</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Liste des commandes (Etat CF)</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Numero</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Marque</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Modele</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Gamme</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Prix achat HT</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">ETA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCommandes.map((cmd) => (
                <tr key={cmd.id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-4 text-sm text-slate-600">
                    {new Date(cmd.date_commande).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-medium text-slate-900">{cmd.numero_commande}</span>
                  </td>
                  <td className="py-4 px-4 text-slate-900">{cmd.marque || '-'}</td>
                  <td className="py-4 px-4 text-slate-900">{cmd.modele || '-'}</td>
                  <td className="py-4 px-4 text-slate-900">{cmd.gamme || '-'}</td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-semibold text-slate-900">
                      {cmd.prix_achat_ht ? cmd.prix_achat_ht.toLocaleString() : '-'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {cmd.eta ? (
                      <div>
                        <p
                          className={`text-sm ${
                            isEtaOverdue(cmd.eta) ? 'text-rose-600 font-semibold' : 'text-slate-600'
                          }`}
                        >
                          {new Date(cmd.eta).toLocaleDateString('fr-FR')}
                        </p>
                        {isEtaOverdue(cmd.eta) && (
                          <p className="text-xs text-rose-500">Retard</p>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCommandes.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Aucune commande fournisseur trouvee</p>
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

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Nouvelle commande fournisseur</h2>
            {!showAllTabs && (
              <ModalTabs
                tabs={[
                  { id: 'commande', label: 'Commande' },
                  { id: 'produit', label: 'Produit' },
                  { id: 'finances', label: 'Finances' },
                ]}
                activeTab={activeTab}
                onChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
              />
            )}

            {(showAllTabs || activeTab === 'commande') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Numero commande</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.numero_commande}
                    onChange={(e) => setFormData({ ...formData, numero_commande: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.date_commande}
                    onChange={(e) => setFormData({ ...formData, date_commande: e.target.value })}
                  />
                </div>
              </div>
            )}

            {(showAllTabs || activeTab === 'produit') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Marque</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    list={marqueListId}
                    value={formData.marque || ''}
                    onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Modele</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    list={modeleListId}
                    value={formData.modele || ''}
                    onChange={(e) => handleModeleChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Gamme</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                  <label className="text-sm font-medium text-slate-700">Prix achat HT</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.prix_achat_ht ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, prix_achat_ht: value === '' ? null : Number(value) });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">ETA</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.eta || ''}
                    onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
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
                onClick={submitCommande}
                disabled={submitLoading || !formData.numero_commande || !formData.marque}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
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





