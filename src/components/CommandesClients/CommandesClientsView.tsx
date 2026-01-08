import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFilialeContext } from '../../contexts/FilialeContext';
import { supabase } from '../../lib/supabase';
import { ShoppingCart, Filter, Calendar, TrendingUp, X } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { ModalTabs } from '../ui/ModalTabs';
import { useListeReference } from '../../hooks/useListeReference';

type CommandeClient = Database['public']['Tables']['commandes_clients']['Row'];
type CommandeInsert = Database['public']['Tables']['commandes_clients']['Insert'];

type CommandeForm = Omit<CommandeInsert, 'filiale_id' | 'created_by_id'> & {
  filiale_id: string | null;
  created_by_id: string | null;
};

export function CommandesClientsView() {
  const { profile } = useAuth();
  const { filialeId, isAdmin } = useFilialeContext();
  const { modeles, modeleLookup, marques, categories, pays, vendeurs } = useListeReference();
  const modeleListId = 'commandes-clients-modeles';
  const marqueListId = 'commandes-clients-marques';
  const gammeListId = 'commandes-clients-gammes';
  const paysListId = 'commandes-clients-pays';
  const vendeursListId = 'commandes-clients-vendeurs';
  const [commandes, setCommandes] = useState<CommandeClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'client' | 'produit' | 'finances'>('client');
  const showAllTabs = true;
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState<CommandeForm>({
    filiale_id: null,
    numero_commande: '',
    date_commande: new Date().toISOString().slice(0, 10),
    client_nom: '',
    marque: '',
    modele: '',
    numero_serie: '',
    gamme: '',
    pays: '',
    vendeur: '',
    ca_ht: 0,
    prevision_facturation: '',
    created_by_id: null,
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

  const loadCommandes = useCallback(async () => {
    if (!profile) return;

    let query = supabase
      .from('commandes_clients')
      .select('id, filiale_id, numero_commande, date_commande, client_nom, marque, modele, numero_serie, gamme, pays, vendeur, ca_ht, prevision_facturation')
      .order('date_commande', { ascending: false });

    if (filialeId) {
      query = query.eq('filiale_id', filialeId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setCommandes(data as CommandeClient[]);
    }

    setLoading(false);
  }, [filialeId, profile]);

  useEffect(() => {
    loadCommandes();
  }, [loadCommandes]);

  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      ...prev,
      filiale_id: filialeId || null,
      created_by_id: profile.id,
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

    if (!formData.numero_commande || !formData.client_nom) {
      setSubmitError('Numero et client sont requis.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);

    const payload: CommandeInsert = {
      numero_commande: formData.numero_commande,
      date_commande: formData.date_commande,
      client_nom: formData.client_nom,
      marque: formData.marque || null,
      modele: formData.modele || null,
      numero_serie: formData.numero_serie || null,
      gamme: formData.gamme || null,
      pays: formData.pays || null,
      vendeur: formData.vendeur || null,
      ca_ht: Number(formData.ca_ht) || 0,
      prevision_facturation: formData.prevision_facturation || null,
      filiale_id: filialeId,
      created_by_id: profile.id,
    };

    const { error } = await supabase.from('commandes_clients').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    setSubmitLoading(false);
    setIsModalOpen(false);
    setFormData({
      ...formData,
      numero_commande: '',
      date_commande: new Date().toISOString().slice(0, 10),
      client_nom: '',
      marque: '',
      modele: '',
      numero_serie: '',
      gamme: '',
      pays: '',
      vendeur: '',
      ca_ht: 0,
      prevision_facturation: '',
      filiale_id: filialeId || null,
      created_by_id: profile.id,
    });
    loadCommandes();
  };

  const filteredCommandes = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return commandes.filter((cmd) =>
      [
        cmd.client_nom,
        cmd.numero_commande,
        cmd.marque || '',
        cmd.modele || '',
        cmd.vendeur || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [commandes, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const totalCA = filteredCommandes.reduce((sum, cmd) => sum + (cmd.ca_ht || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Commandes Clients</h1>
          <p className="text-slate-600">ETAT CC : Date, Client, Marque, Modele, S/N, Gamme, Pays, Vendeur, CA HT, Prevision facturation, N? Commande</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition shadow-lg hover:shadow-xl"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="font-medium">Nouvelle commande</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Total Commandes</p>
            <ShoppingCart className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{filteredCommandes.length}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">CA Prevu Total</p>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {totalCA.toLocaleString()} <span className="text-sm text-slate-500">XAF</span>
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Commandes avec facturation prevue</p>
            <Calendar className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {filteredCommandes.filter((c) => c.prevision_facturation).length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Liste des Commandes (ETAT CC)</h2>
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Prevision facturation</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">N? Commande</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCommandes.map((cmd) => (
                <tr key={cmd.id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-4 text-sm text-slate-600">
                    {new Date(cmd.date_commande).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-4 px-4 font-medium text-slate-900">{cmd.client_nom}</td>
                  <td className="py-4 px-4 text-slate-900">{cmd.marque || '-'}</td>
                  <td className="py-4 px-4 text-slate-900">{cmd.modele || '-'}</td>
                  <td className="py-4 px-4 text-sm text-slate-700">{cmd.numero_serie || '-'}</td>
                  <td className="py-4 px-4 text-sm text-slate-700">{cmd.gamme || '-'}</td>
                  <td className="py-4 px-4 text-sm text-slate-700">{cmd.pays || '-'}</td>
                  <td className="py-4 px-4 text-sm text-slate-700">{cmd.vendeur || '-'}</td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-semibold text-slate-900">
                      {(cmd.ca_ht || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600">
                    {cmd.prevision_facturation
                      ? new Date(cmd.prevision_facturation).toLocaleDateString('fr-FR')
                      : '-'}
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-700">{cmd.numero_commande}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCommandes.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Aucune commande client trouvee</p>
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

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Nouvelle commande client</h2>
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
                  <label className="text-sm font-medium text-slate-700">N? commande</label>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Client</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.client_nom}
                    onChange={(e) => setFormData({ ...formData, client_nom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Vendeur</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    list={vendeursListId}
                    value={formData.vendeur || ''}
                    onChange={(e) => setFormData({ ...formData, vendeur: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Pays</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                  <label className="text-sm font-medium text-slate-700">S/N</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.numero_serie || ''}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
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
                  <label className="text-sm font-medium text-slate-700">CA HT</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.ca_ht ?? 0}
                    onChange={(e) => setFormData({ ...formData, ca_ht: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Prevision de facturation</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.prevision_facturation ?? ''}
                    onChange={(e) => setFormData({ ...formData, prevision_facturation: e.target.value })}
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
                onClick={submitCommande}
                disabled={submitLoading || !formData.numero_commande || !formData.client_nom}
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





