import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Truck, Package, Calendar, TrendingUp, Filter, X } from 'lucide-react';

type CommandeStatut = 'En_cours' | 'Livree' | 'Partiellement_livree' | 'Annulee';

interface CommandeFournisseur {
  id: string;
  numero: string;
  fournisseur: string;
  filiale_id: string;
  date_commande: string;
  date_livraison_prevue: string | null;
  statut: CommandeStatut;
  montant_total: number;
  devise: string;
  commentaires: string | null;
}

type CommandeInsert = {
  numero: string;
  fournisseur: string;
  filiale_id: string | null;
  date_commande: string;
  date_livraison_prevue?: string | null;
  statut: CommandeStatut;
  montant_total: number;
  devise: string;
  commentaires?: string | null;
  created_by?: string | null;
};

export function CommandesFournisseursView() {
  const { profile } = useAuth();
  const [commandes, setCommandes] = useState<CommandeFournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatut, setSelectedStatut] = useState<CommandeStatut | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState<CommandeInsert>({
    numero: '',
    fournisseur: '',
    date_commande: new Date().toISOString().slice(0, 10),
    date_livraison_prevue: '',
    statut: 'En_cours',
    montant_total: 0,
    devise: 'XAF',
    commentaires: '',
    filiale_id: null,
    created_by: null,
  });
  const [modele, setModele] = useState('');
  const [gamme, setGamme] = useState('');

  const loadCommandes = useCallback(async () => {
    if (!profile) return;

    const isAdmin = profile.role === 'admin_siege';
    if (!isAdmin && !profile.filiale_id) {
      setCommandes([]);
      setLoading(false);
      return;
    }

    const table = supabase.from('commandes_fournisseurs' as any);

    let query = table
      .select(
        'id, numero, fournisseur, filiale_id, date_commande, date_livraison_prevue, statut, montant_total, devise, commentaires'
      )
      .order('date_commande', { ascending: false });

    if (!isAdmin && profile.filiale_id) {
      query = query.eq('filiale_id', profile.filiale_id);
    }

    if (selectedStatut !== 'all') {
      query = query.eq('statut', selectedStatut);
    }

    const { data, error } = await query;
    if (!error && data) {
      setCommandes(data as unknown as CommandeFournisseur[]);
    }
    setLoading(false);
  }, [profile, selectedStatut]);

  useEffect(() => {
    loadCommandes();
  }, [loadCommandes]);

  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      ...prev,
      filiale_id: profile.filiale_id || null,
      created_by: profile.id,
    }));
  }, [profile]);

  const submitCommande = async () => {
    if (!profile) return;
    if (!formData.numero) {
      setSubmitError('Numéro de commande requis.');
      return;
    }
    if (!formData.fournisseur) {
      setSubmitError('Fournisseur / marque requis.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);
    const commentairesParts = [
      modele ? `Modèle: ${modele}` : null,
      gamme ? `Gamme: ${gamme}` : null,
      (formData.commentaires || '').trim() || null,
    ].filter(Boolean);
    const payload: CommandeInsert = {
      ...formData,
      montant_total: Number(formData.montant_total) || 0,
      date_livraison_prevue: formData.date_livraison_prevue || null,
      commentaires: commentairesParts.length > 0 ? commentairesParts.join(' | ') : null,
      filiale_id: profile.filiale_id || null,
      created_by: profile.id,
    };
    const { error } = await supabase.from('commandes_fournisseurs' as any).insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    setSubmitLoading(false);
    setIsModalOpen(false);
    setFormData({
      numero: '',
      fournisseur: '',
      date_commande: new Date().toISOString().slice(0, 10),
      date_livraison_prevue: '',
      statut: 'En_cours',
      montant_total: 0,
      devise: 'XAF',
      commentaires: '',
      filiale_id: profile.filiale_id || null,
      created_by: profile.id,
    });
    setModele('');
    setGamme('');
    loadCommandes();
  };

  const filteredCommandes = commandes.filter(
    (cmd) =>
      cmd.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cmd.fournisseur || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const totalAchat = filteredCommandes.reduce((sum, cmd) => sum + cmd.montant_total, 0);
  const commandesEnCours = filteredCommandes.filter(
    (c) => c.statut === 'En_cours' || c.statut === 'Partiellement_livree'
  ).length;
  const commandesRecues = filteredCommandes.filter((c) => c.statut === 'Livree').length;

  const isETAOverdue = (eta: string | null, statut: string) => {
    if (!eta || statut === 'Livree' || statut === 'Annulee') return false;
    return new Date(eta) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Commandes Fournisseurs</h1>
          <p className="text-slate-600">
            Gestion des commandes fournisseurs et suivi des livraisons (aligné sur l’état PDF)
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
            <p className="text-sm text-slate-600">Total Commandes</p>
            <Truck className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{filteredCommandes.length}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">En Cours</p>
            <Package className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{commandesEnCours}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Livrées</p>
            <Calendar className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{commandesRecues}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Total Achats</p>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {totalAchat.toLocaleString()} <span className="text-sm text-slate-500">XAF</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Liste des Commandes (ETAT CF)</h2>
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value as CommandeStatut | 'all')}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="En_cours">En cours</option>
              <option value="Partiellement_livree">Partiellement livrée</option>
              <option value="Livree">Livrée</option>
              <option value="Annulee">Annulée</option>
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">N° Commande</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Marque / Fournisseur</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Modèle / Gamme</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Prix Achat HT</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">ETA</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCommandes.map((cmd) => {
                const commentaireLabel = cmd.commentaires || '-';
                return (
                  <tr key={cmd.id} className="hover:bg-slate-50 transition">
                    <td className="py-4 px-4 text-sm text-slate-600">
                      {new Date(cmd.date_commande).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-slate-900">{cmd.numero}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-900">{cmd.fournisseur}</td>
                    <td className="py-4 px-4 text-slate-900">
                      <span className="text-sm text-slate-700">{commentaireLabel}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-semibold text-slate-900">
                        {cmd.montant_total.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">{cmd.devise}</span>
                    </td>
                    <td className="py-4 px-4">
                      {cmd.date_livraison_prevue ? (
                        <div>
                          <p
                            className={`text-sm ${
                              isETAOverdue(cmd.date_livraison_prevue, cmd.statut)
                                ? 'text-red-600 font-semibold'
                                : 'text-slate-600'
                            }`}
                          >
                            {new Date(cmd.date_livraison_prevue).toLocaleDateString('fr-FR')}
                          </p>
                          {isETAOverdue(cmd.date_livraison_prevue, cmd.statut) && (
                            <p className="text-xs text-red-500">Retard</p>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
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
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Aucune commande fournisseur trouvée</p>
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

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Nouvelle commande fournisseur</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">N° commande</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
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
                <label className="text-sm font-medium text-slate-700">Marque / Fournisseur</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.fournisseur}
                  onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Modèle</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={modele}
                  onChange={(e) => setModele(e.target.value)}
                  placeholder="Ex: MF 7715"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Gamme</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={gamme}
                  onChange={(e) => setGamme(e.target.value)}
                  placeholder="Ex: Tracteurs / Chariots"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Prix achat HT</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.montant_total}
                  onChange={(e) => setFormData({ ...formData, montant_total: Number(e.target.value) })}
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
                <label className="text-sm font-medium text-slate-700">ETA</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.date_livraison_prevue || ''}
                  onChange={(e) => setFormData({ ...formData, date_livraison_prevue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Statut</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.statut}
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value as CommandeStatut })}
                >
                  <option value="En_cours">En cours</option>
                  <option value="Partiellement_livree">Partiellement livrée</option>
                  <option value="Livree">Livrée</option>
                  <option value="Annulee">Annulée</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={3}
                value={formData.commentaires || ''}
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
                disabled={submitLoading || !formData.numero || !formData.fournisseur}
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
