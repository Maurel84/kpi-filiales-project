import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Truck, Package, Calendar, TrendingUp, Filter } from 'lucide-react';

interface CommandeFournisseur {
  id: string;
  numero_commande: string;
  date_commande: string;
  marque: { nom: string } | null;
  modele: string | null;
  gamme: string | null;
  prix_achat_ht: number;
  devise: string;
  eta: string | null;
  statut: string;
  notes: string | null;
}

export function CommandesFournisseursView() {
  const { profile } = useAuth();
  const [commandes, setCommandes] = useState<CommandeFournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCommandes();
  }, [profile, selectedStatut]);

  const loadCommandes = async () => {
    if (!profile) return;

    let query = supabase
      .from('commandes_fournisseurs')
      .select(`
        id,
        numero_commande,
        date_commande,
        marques (nom),
        modele,
        gamme,
        prix_achat_ht,
        devise,
        eta,
        statut,
        notes
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
      En_attente: 'bg-amber-100 text-amber-800',
      Confirmee: 'bg-blue-100 text-blue-800',
      En_transit: 'bg-purple-100 text-purple-800',
      Recue: 'bg-emerald-100 text-emerald-800',
      Annulee: 'bg-slate-100 text-slate-800',
    };
    return badges[statut as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getStatutLabel = (statut: string) => {
    const labels = {
      En_attente: 'En attente',
      Confirmee: 'Confirmée',
      En_transit: 'En transit',
      Recue: 'Reçue',
      Annulee: 'Annulée',
    };
    return labels[statut as keyof typeof labels] || statut;
  };

  const filteredCommandes = commandes.filter(
    (cmd) =>
      cmd.numero_commande.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cmd.marque?.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cmd.modele || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const totalAchat = filteredCommandes.reduce((sum, cmd) => sum + cmd.prix_achat_ht, 0);
  const commandesEnCours = filteredCommandes.filter(
    (c) => c.statut === 'En_attente' || c.statut === 'Confirmee' || c.statut === 'En_transit'
  ).length;
  const commandesRecues = filteredCommandes.filter((c) => c.statut === 'Recue').length;

  const isETAOverdue = (eta: string | null, statut: string) => {
    if (!eta || statut === 'Recue' || statut === 'Annulee') return false;
    return new Date(eta) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Commandes Fournisseurs</h1>
          <p className="text-slate-600">
            Gestion des commandes fournisseurs et suivi des livraisons
          </p>
        </div>
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
            <p className="text-sm text-slate-600">Reçues</p>
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
          <h2 className="text-lg font-semibold text-slate-900">Liste des Commandes</h2>
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="En_attente">En attente</option>
              <option value="Confirmee">Confirmée</option>
              <option value="En_transit">En transit</option>
              <option value="Recue">Reçue</option>
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  N° Commande
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Marque
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Modèle
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Gamme
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  Prix Achat HT
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  ETA
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Statut
                </th>
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
                  <td className="py-4 px-4">
                    <span className="font-medium text-slate-900">{cmd.marque?.nom || '-'}</span>
                  </td>
                  <td className="py-4 px-4 text-slate-900">{cmd.modele || '-'}</td>
                  <td className="py-4 px-4 text-sm text-slate-600">{cmd.gamme || '-'}</td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-semibold text-slate-900">
                      {cmd.prix_achat_ht.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">{cmd.devise}</span>
                  </td>
                  <td className="py-4 px-4">
                    {cmd.eta ? (
                      <div>
                        <p
                          className={`text-sm ${
                            isETAOverdue(cmd.eta, cmd.statut)
                              ? 'text-red-600 font-semibold'
                              : 'text-slate-600'
                          }`}
                        >
                          {new Date(cmd.eta).toLocaleDateString('fr-FR')}
                        </p>
                        {isETAOverdue(cmd.eta, cmd.statut) && (
                          <p className="text-xs text-red-500">Retard</p>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
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
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Aucune commande fournisseur trouvée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
