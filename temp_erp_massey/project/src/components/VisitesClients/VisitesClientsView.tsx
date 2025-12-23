import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, TrendingUp, Target, Calendar, Phone, Mail, Globe } from 'lucide-react';

interface VisiteClient {
  id: string;
  date_visite: string;
  nom_client: string;
  prenom_client: string | null;
  fonction_client: string | null;
  telephone_client: string | null;
  whatsapp_client: string | null;
  email_client: string | null;
  url_societe_client: string | null;
  notes: string | null;
  visite_par: { prenom: string; nom: string } | null;
}

interface Opportunite {
  id: string;
  nom_projet: string;
  ville: string | null;
  marques: string[] | null;
  modeles: string[] | null;
  quantites: number | null;
  ca_ht_potentiel: number | null;
  devise: string;
  pourcentage_marge: number | null;
  date_closing_prevue: string | null;
  statut: string;
  taux_cloture_percent: number | null;
  notes: string | null;
  visite: { nom_client: string; prenom_client: string | null } | null;
}

export function VisitesClientsView() {
  const { profile } = useAuth();
  const [visites, setVisites] = useState<VisiteClient[]>([]);
  const [opportunites, setOpportunites] = useState<Opportunite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'visites' | 'opportunites'>('visites');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    let visitesQuery = supabase
      .from('visites_clients')
      .select(`
        id,
        date_visite,
        nom_client,
        prenom_client,
        fonction_client,
        telephone_client,
        whatsapp_client,
        email_client,
        url_societe_client,
        notes,
        visite_par:users_profiles!visite_par_id (prenom, nom)
      `)
      .order('date_visite', { ascending: false });

    let oppsQuery = supabase
      .from('opportunites')
      .select(`
        id,
        nom_projet,
        ville,
        marques,
        modeles,
        quantites,
        ca_ht_potentiel,
        devise,
        pourcentage_marge,
        date_closing_prevue,
        statut,
        taux_cloture_percent,
        notes,
        visite:visites_clients!visite_id (nom_client, prenom_client)
      `)
      .order('date_closing_prevue', { ascending: true, nullsFirst: false });

    if (profile.role !== 'admin_siege' && profile.filiale_id) {
      visitesQuery = visitesQuery.eq('filiale_id', profile.filiale_id);
      oppsQuery = oppsQuery.eq('filiale_id', profile.filiale_id);
    }

    const [{ data: visitesData }, { data: oppsData }] = await Promise.all([
      visitesQuery,
      oppsQuery,
    ]);

    if (visitesData) setVisites(visitesData as any);
    if (oppsData) setOpportunites(oppsData as any);

    setLoading(false);
  };

  const getStatutBadge = (statut: string) => {
    const badges = {
      Gagne: 'bg-emerald-100 text-emerald-800',
      En_cours: 'bg-blue-100 text-blue-800',
      Reporte: 'bg-amber-100 text-amber-800',
      Abandonne: 'bg-slate-100 text-slate-800',
      Perdu: 'bg-red-100 text-red-800',
    };
    return badges[statut as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getStatutLabel = (statut: string) => {
    const labels = {
      Gagne: 'Gagné',
      En_cours: 'En cours',
      Reporte: 'Reporté',
      Abandonne: 'Abandonné',
      Perdu: 'Perdu',
    };
    return labels[statut as keyof typeof labels] || statut;
  };

  const filteredOpportunites = selectedStatut === 'all'
    ? opportunites
    : opportunites.filter(opp => opp.statut === selectedStatut);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const totalPotentiel = filteredOpportunites.reduce((sum, opp) => sum + (opp.ca_ht_potentiel || 0), 0);
  const oppsEnCours = filteredOpportunites.filter(o => o.statut === 'En_cours').length;
  const oppsGagnees = filteredOpportunites.filter(o => o.statut === 'Gagne').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Visites Clients & Opportunités</h1>
          <p className="text-slate-600">
            Suivi des visites clients et gestion du pipeline commercial
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Visites Totales</p>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{visites.length}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Opportunités</p>
            <Target className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{oppsEnCours}</p>
          <p className="text-xs text-slate-500 mt-1">en cours</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Gagnées</p>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{oppsGagnees}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">CA Potentiel</p>
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {totalPotentiel.toLocaleString()} <span className="text-sm text-slate-500">XAF</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex space-x-1 p-1">
            <button
              onClick={() => setActiveTab('visites')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                activeTab === 'visites'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Visites Clients
            </button>
            <button
              onClick={() => setActiveTab('opportunites')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                activeTab === 'opportunites'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Opportunités
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'visites' ? (
            <div className="space-y-4">
              {visites.map((visite) => (
                <div
                  key={visite.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {visite.nom_client} {visite.prenom_client}
                      </h3>
                      {visite.fonction_client && (
                        <p className="text-sm text-slate-600">{visite.fonction_client}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm text-slate-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(visite.date_visite).toLocaleDateString('fr-FR')}
                      </div>
                      {visite.visite_par && (
                        <p className="text-xs text-slate-500 mt-1">
                          Par: {visite.visite_par.prenom} {visite.visite_par.nom}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {visite.telephone_client && (
                      <div className="flex items-center text-sm text-slate-600">
                        <Phone className="w-4 h-4 mr-2 text-slate-400" />
                        <span>{visite.telephone_client}</span>
                      </div>
                    )}
                    {visite.email_client && (
                      <div className="flex items-center text-sm text-slate-600">
                        <Mail className="w-4 h-4 mr-2 text-slate-400" />
                        <span className="truncate">{visite.email_client}</span>
                      </div>
                    )}
                    {visite.url_societe_client && (
                      <div className="flex items-center text-sm text-slate-600">
                        <Globe className="w-4 h-4 mr-2 text-slate-400" />
                        <a
                          href={visite.url_societe_client}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate"
                        >
                          Site web
                        </a>
                      </div>
                    )}
                  </div>

                  {visite.notes && (
                    <div className="mt-3 p-3 bg-slate-50 rounded text-sm text-slate-700">
                      {visite.notes}
                    </div>
                  )}
                </div>
              ))}

              {visites.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Aucune visite client enregistrée</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Pipeline Commercial</h3>
                <select
                  value={selectedStatut}
                  onChange={(e) => setSelectedStatut(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="Gagne">Gagné</option>
                  <option value="En_cours">En cours</option>
                  <option value="Reporte">Reporté</option>
                  <option value="Abandonne">Abandonné</option>
                  <option value="Perdu">Perdu</option>
                </select>
              </div>

              <div className="space-y-4">
                {filteredOpportunites.map((opp) => (
                  <div
                    key={opp.id}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{opp.nom_projet}</h3>
                        {opp.visite && (
                          <p className="text-sm text-slate-600">
                            Client: {opp.visite.nom_client} {opp.visite.prenom_client}
                          </p>
                        )}
                        {opp.ville && (
                          <p className="text-xs text-slate-500">{opp.ville}</p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatutBadge(
                          opp.statut
                        )}`}
                      >
                        {getStatutLabel(opp.statut)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-slate-500">CA Potentiel</p>
                        <p className="font-semibold text-slate-900">
                          {opp.ca_ht_potentiel?.toLocaleString() || '-'} {opp.devise}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Quantités</p>
                        <p className="font-semibold text-slate-900">{opp.quantites || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Marge</p>
                        <p className="font-semibold text-slate-900">
                          {opp.pourcentage_marge ? `${opp.pourcentage_marge}%` : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Taux Clôture</p>
                        <p className="font-semibold text-slate-900">
                          {opp.taux_cloture_percent ? `${opp.taux_cloture_percent}%` : '-'}
                        </p>
                      </div>
                    </div>

                    {opp.marques && opp.marques.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-slate-500 mb-1">Marques:</p>
                        <div className="flex flex-wrap gap-2">
                          {opp.marques.map((marque, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                            >
                              {marque}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {opp.date_closing_prevue && (
                      <div className="flex items-center text-sm text-slate-600 mt-2">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        Clôture prévue:{' '}
                        {new Date(opp.date_closing_prevue).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                ))}

                {filteredOpportunites.length === 0 && (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">Aucune opportunité trouvée</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
