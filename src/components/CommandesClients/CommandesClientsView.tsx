import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ShoppingCart, Filter, Calendar, TrendingUp, AlertCircle, X } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type StatutCommande = 'En_cours' | 'Facture' | 'Livre' | 'Annule';

interface CommandeClient {
  id: string;
  filiale_id: string | null;
  numero_commande: string;
  date_commande: string;
  client_nom: string;
  marque_id: string | null;
  modele: string | null;
  numero_serie: string | null;
  gamme: string | null;
  pays: string | null;
  vendeur_id: string | null;
  ca_ht_prevu: number | null;
  devise: string;
  prevision_facturation: string | null;
  statut: StatutCommande;
  commentaires: string | null;
}

type CommandeInsert = Omit<CommandeClient, 'id'>;
type UserProfile = Database['public']['Tables']['users_profiles']['Row'];
type Marque = Database['public']['Tables']['marques']['Row'];

export function CommandesClientsView() {
  const { profile } = useAuth();
  const [commandes, setCommandes] = useState<CommandeClient[]>([]);
  const [vendeurs, setVendeurs] = useState<UserProfile[]>([]);
  const [marques, setMarques] = useState<Marque[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState<CommandeInsert>({
    filiale_id: null,
    numero_commande: '',
    date_commande: new Date().toISOString().slice(0, 10),
    client_nom: '',
    marque_id: '',
    modele: '',
    numero_serie: '',
    gamme: '',
    pays: '',
    vendeur_id: '',
    ca_ht_prevu: 0,
    devise: 'XAF',
    prevision_facturation: '',
    statut: 'En_cours',
    commentaires: '',
  });

  const loadCommandes = useCallback(async () => {
    if (!profile) return;

    let query = supabase
      .from('commandes_clients')
      .select(
        'id, filiale_id, numero_commande, date_commande, client_nom, marque_id, modele, numero_serie, gamme, pays, vendeur_id, ca_ht_prevu, devise, prevision_facturation, statut, commentaires'
      )
      .order('date_commande', { ascending: false });

    if (profile.role !== 'admin_siege' && profile.filiale_id) {
      query = query.eq('filiale_id', profile.filiale_id);
    }

    if (selectedStatut !== 'all') {
      query = query.eq('statut', selectedStatut as StatutCommande);
    }

    const { data, error } = await query;

    if (!error && data) {
      setCommandes(data as CommandeClient[]);
    }

    setLoading(false);
  }, [profile, selectedStatut]);

  useEffect(() => {
    loadCommandes();
  }, [loadCommandes]);

  useEffect(() => {
    const loadVendeurs = async () => {
      if (!profile) return;
      let query = supabase.from('users_profiles').select('*').eq('actif', true).order('nom');
      if (profile.role !== 'admin_siege') {
        if (!profile.filiale_id) {
          setVendeurs([]);
          return;
        }
        query = query.eq('filiale_id', profile.filiale_id);
      }
      const { data } = await query;
      if (data) setVendeurs(data as UserProfile[]);
    };
    loadVendeurs();
  }, [profile]);

  useEffect(() => {
    const loadMarques = async () => {
      const { data } = await supabase.from('marques').select('id, nom').eq('actif', true).order('nom');
      if (data) setMarques(data as Marque[]);
    };
    loadMarques();
  }, []);

  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      ...prev,
      filiale_id: profile.filiale_id || null,
      vendeur_id: prev.vendeur_id || profile.id,
    }));
  }, [profile]);

  const vendeurMap = useMemo(() => new Map(vendeurs.map((vendeur) => [vendeur.id, vendeur])), [vendeurs]);
  const marqueMap = useMemo(() => new Map(marques.map((marque) => [marque.id, marque.nom || ''])), [marques]);
  const roleLabels: Record<UserProfile['role'], string> = {
    admin_siege: 'Admin siege',
    manager_filiale: 'Manager filiale',
    commercial: 'Commercial',
    technicien: 'Technicien',
    saisie: 'Saisie',
  };
  const getVendeurInfo = (id: string | null) => {
    if (!id) return { label: '-', meta: '' };
    const vendeur = vendeurMap.get(id);
    if (!vendeur) return { label: 'Utilisateur', meta: '' };
    const label =
      [vendeur.prenom, vendeur.nom].filter(Boolean).join(' ').trim() || vendeur.email || 'Utilisateur';
    const meta = [vendeur.poste, roleLabels[vendeur.role]].filter(Boolean).join(' - ');
    return { label, meta };
  };

  const getMarqueLabel = (id: string | null) => {
    if (!id) return '';
    return marqueMap.get(id) || '';
  };

  const submitCommande = async () => {
    if (!profile) return;
    if (!formData.numero_commande || !formData.client_nom) {
      setSubmitError('Numéro et client sont requis.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);
    const payload: CommandeInsert = {
      ...formData,
      ca_ht_prevu: Number(formData.ca_ht_prevu) || 0,
      prevision_facturation: formData.prevision_facturation || null,
      commentaires: formData.commentaires || null,
      marque_id: formData.marque_id || null,
      modele: formData.modele || null,
      numero_serie: formData.numero_serie || null,
      gamme: formData.gamme || null,
      pays: formData.pays || null,
      vendeur_id: formData.vendeur_id || null,
      filiale_id: profile.filiale_id || null,
    };
    const { error } = await supabase.from('commandes_clients' as any).insert(payload);
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
      marque_id: '',
      modele: '',
      numero_serie: '',
      gamme: '',
      pays: '',
      vendeur_id: profile.id,
      ca_ht_prevu: 0,
      devise: 'XAF',
      prevision_facturation: '',
      statut: 'En_cours',
      commentaires: '',
      filiale_id: profile.filiale_id || null,
    });
    loadCommandes();
  };

  const filteredCommandes = commandes.filter((cmd) =>
    [cmd.client_nom, cmd.numero_commande, cmd.modele || '', getMarqueLabel(cmd.marque_id)]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const totalCA = filteredCommandes.reduce((sum, cmd) => sum + (cmd.ca_ht_prevu || 0), 0);
  const commandesEnCours = filteredCommandes.filter((c) => c.statut === 'En_cours').length;
  const commandesFacturees = filteredCommandes.filter((c) => c.statut === 'Facture').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Commandes Clients</h1>
          <p className="text-slate-600">Gestion des commandes clients et suivi de facturation (ETAT CC)</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition shadow-lg hover:shadow-xl"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="font-medium">Nouvelle commande</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Total Commandes</p>
            <ShoppingCart className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{filteredCommandes.length}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">En Cours</p>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{commandesEnCours}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Facturées</p>
            <Calendar className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{commandesFacturees}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">CA Prévu Total</p>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {totalCA.toLocaleString()} <span className="text-sm text-slate-500">XAF</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Liste des Commandes (ETAT CC)</h2>
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="En_cours">En cours</option>
              <option value="Facture">Facturée</option>
              <option value="Livre">Livrée</option>
              <option value="Annule">Annulée</option>
            </select>

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
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Marque / Modèle</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">S/N</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Gamme</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Pays</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Vendeur</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">CA HT prévu</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Prévision de facturation</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">N° Commande</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCommandes.map((cmd) => {
                const vendeurInfo = getVendeurInfo(cmd.vendeur_id);
                return (
                <tr key={cmd.id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-4 text-sm text-slate-600">
                    {new Date(cmd.date_commande).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-4 px-4 font-medium text-slate-900">{cmd.client_nom}</td>
                  <td className="py-4 px-4 text-slate-900">
                    <div className="text-sm">
                      <div className="font-medium">{cmd.modele || '-'}</div>
                    <div className="text-xs text-slate-500">Marque: {getMarqueLabel(cmd.marque_id) || '-'}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-700">{cmd.numero_serie || '-'}</td>
                  <td className="py-4 px-4 text-sm text-slate-700">{cmd.gamme || '-'}</td>
                  <td className="py-4 px-4 text-sm text-slate-700">{cmd.pays || '-'}</td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-slate-900">{vendeurInfo.label}</div>
                    {vendeurInfo.meta && <div className="text-xs text-slate-500">{vendeurInfo.meta}</div>}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-semibold text-slate-900">
                      {cmd.ca_ht_prevu?.toLocaleString() || '-'}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">{cmd.devise}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600">
                    {cmd.prevision_facturation
                      ? new Date(cmd.prevision_facturation).toLocaleDateString('fr-FR')
                      : '-'}
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-700">{cmd.numero_commande}</td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {cmd.statut}
                    </span>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>

          {filteredCommandes.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Aucune commande client trouvée</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Nouvelle commande client</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">N° commande</label>
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
                <label className="text-sm font-medium text-slate-700">Marque</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.marque_id || ''}
                  onChange={(e) => setFormData({ ...formData, marque_id: e.target.value })}
                >
                  <option value="">Sélectionner une marque</option>
                  {marques.map((marque) => (
                    <option key={marque.id} value={marque.id}>
                      {marque.nom || 'Marque'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Modèle</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.modele || ''}
                  onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
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
                  value={formData.gamme || ''}
                  onChange={(e) => setFormData({ ...formData, gamme: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Pays</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.pays || ''}
                  onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Vendeur</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.vendeur_id || ''}
                  onChange={(e) => setFormData({ ...formData, vendeur_id: e.target.value })}
                >
                  <option value="">Sélectionner</option>
                  {vendeurs.map((vendeur) => {
                    const label =
                      [vendeur.prenom, vendeur.nom].filter(Boolean).join(' ').trim() ||
                      vendeur.email ||
                      'Utilisateur';
                    const extra = vendeur.poste ? ` - ${vendeur.poste}` : '';
                    return (
                      <option key={vendeur.id} value={vendeur.id}>
                        {label}{extra}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">CA HT prévu</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.ca_ht_prevu ?? 0}
                  onChange={(e) => setFormData({ ...formData, ca_ht_prevu: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Devise</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.devise}
                  onChange={(e) => setFormData({ ...formData, devise: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Prévision de facturation</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.prevision_facturation ?? ''}
                  onChange={(e) => setFormData({ ...formData, prevision_facturation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Statut</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.statut}
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value as StatutCommande })}
                >
                  <option value="En_cours">En cours</option>
                  <option value="Facture">Facturée</option>
                  <option value="Livre">Livrée</option>
                  <option value="Annule">Annulée</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium text-slate-700">Commentaires</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={3}
                value={formData.commentaires ?? ''}
                onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
              />
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
