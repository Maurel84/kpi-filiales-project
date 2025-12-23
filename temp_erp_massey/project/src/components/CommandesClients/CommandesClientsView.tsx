import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ShoppingCart, Filter, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

interface CommandeClient {
  id: string;
  numero_commande: string;
  date_commande: string;
  client_nom: string;
  marque: { nom: string } | null;
  modele: string | null;
  numero_serie: string | null;
  gamme: string | null;
  pays: string | null;
  vendeur: { prenom: string; nom: string } | null;
  ca_ht_prevu: number | null;
  devise: string;
  prevision_facturation: string | null;
  statut: string;
  commentaires: string | null;
}

export function CommandesClientsView() {
  const { profile } = useAuth();
  const [commandes, setCommandes] = useState<CommandeClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCommandes();
  }, [profile, selectedStatut]);

  const loadCommandes = async () => {
    if (!profile) return;

    let query = supabase
      .from('commandes_clients')
      .select(`
        id,
        numero_commande,
        date_commande,
        client_nom,
        marques (nom),
        modele,
        numero_serie,
        gamme,
        pays,
        vendeur:users_profiles!vendeur_id (prenom, nom),
        ca_ht_prevu,
        devise,
        prevision_facturation,
        statut,
        commentaires
      `)
      .order('date_commande', { ascending: false });

    if (profile.role !== 'admin_siege' && profile.filiale_id) {
      query = query.eq('filiale_id', profile.filiale_id);
    }

    if (selectedStatut !== 'all') {
      query = query.eq('statut', selectedStatut);
    }

    const { data, error } = await query;

    if (!error && data) {
      setCommandes(data as any);
    }

    setLoading(false);
  };

  const getStatutBadge = (statut: string) => {
    const badges = {
      En_cours: 'bg-blue-100 text-blue-800',
      Facture: 'bg-emerald-100 text-emerald-800',
      Livre: 'bg-teal-100 text-teal-800',
      Annule: 'bg-slate-100 text-slate-800',
    };
    return badges[statut as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getStatutLabel = (statut: string) => {
    const labels = {
      En_cours: 'En cours',
      Facture: 'Facturé',
      Livre: 'Livré',
      Annule: 'Annulé',
    };
    return labels[statut as keyof typeof labels] || statut;
  };

  const filteredCommandes = commandes.filter(cmd =>
    cmd.client_nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.numero_commande.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cmd.marque?.nom || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const totalCA = filteredCommandes.reduce((sum, cmd) => sum + (cmd.ca_ht_prevu || 0), 0);
  const commandesEnCours = filteredCommandes.filter(c => c.statut === 'En_cours').length;
  const commandesFacturees = filteredCommandes.filter(c => c.statut === 'Facture').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Commandes Clients</h1>
          <p className="text-slate-600">
            Gestion des commandes clients et suivi de facturation
          </p>
        </div>
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
          <h2 className="text-lg font-semibold text-slate-900">Liste des Commandes</h2>
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="En_cours">En cours</option>
              <option value="Facture">Facturé</option>
              <option value="Livre">Livré</option>
              <option value="Annule">Annulé</option>
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  N° Commande
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Client
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Produit
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Vendeur
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  CA HT Prévu
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Prév. Facturation
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCommandes.map((cmd) => (
                <tr key={cmd.id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-4">
                    <span className="font-medium text-slate-900">{cmd.numero_commande}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600">
                    {new Date(cmd.date_commande).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-medium text-slate-900">{cmd.client_nom}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm">
                      <p className="font-medium text-slate-900">
                        {cmd.marque?.nom} {cmd.modele}
                      </p>
                      {cmd.numero_serie && (
                        <p className="text-xs text-slate-500">S/N: {cmd.numero_serie}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600">
                    {cmd.vendeur ? `${cmd.vendeur.prenom} ${cmd.vendeur.nom}` : '-'}
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
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatutBadge(
                        cmd.statut
                      )}`}
                    >
                      {getStatutLabel(cmd.statut)}
                    </span>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
