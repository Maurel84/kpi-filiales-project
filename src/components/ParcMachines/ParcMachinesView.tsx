import { useEffect, useState } from 'react';
import { Plus, X, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type Machine = Database['public']['Tables']['parc_machines']['Row'];

export function ParcMachinesView() {
  const { profile } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    numero_serie: '',
    marque: '',
    modele: '',
    client_nom: '',
    pays: '',
    ville: '',
    annee_fabrication: '',
    statut: 'Actif',
    date_vente: '',
    coordonnees_gps: '',
    commentaires: '',
  });

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      const isAdmin = profile.role === 'admin_siege';
      const filialeId = profile.filiale_id;
      const query = supabase.from('parc_machines').select('*').order('created_at', { ascending: false });
      if (!isAdmin) {
        if (!filialeId) {
          setMachines([]);
          setLoading(false);
          return;
        }
        const { data, error } = await query.eq('filiale_vendeur_id', filialeId).limit(50);
        if (!error && data) setMachines(data as Machine[]);
        setLoading(false);
        return;
      }
      const { data, error } = await query.limit(50);
      if (!error && data) setMachines(data as Machine[]);
      setLoading(false);
    };
    load();
  }, [profile]);

  const submit = async () => {
    if (!profile) return;
    if (!profile.filiale_id) {
      setSubmitError('Associez une filiale au profil avant de saisir une machine.');
      return;
    }
    if (!formData.numero_serie || !formData.marque || !formData.modele || !formData.client_nom || !formData.pays) {
      setSubmitError('Numéro de série, marque, modèle, client et pays sont requis.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);
    const payload = {
      numero_serie: formData.numero_serie,
      marque: formData.marque,
      modele: formData.modele,
      client_nom: formData.client_nom,
      pays: formData.pays,
      ville: formData.ville || null,
      annee_fabrication: formData.annee_fabrication ? Number(formData.annee_fabrication) : null,
      statut: formData.statut as Machine['statut'],
      date_vente: formData.date_vente || null,
      coordonnees_gps: formData.coordonnees_gps || null,
      commentaires: formData.commentaires || null,
      filiale_vendeur_id: profile.filiale_id,
    };
    const { error } = await supabase.from('parc_machines').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    setSubmitLoading(false);
    setIsModalOpen(false);
    setFormData({
      numero_serie: '',
      marque: '',
      modele: '',
      client_nom: '',
      pays: '',
      ville: '',
      annee_fabrication: '',
      statut: 'Actif',
      date_vente: '',
      coordonnees_gps: '',
      commentaires: '',
    });
    const query = supabase.from('parc_machines').select('*').order('created_at', { ascending: false });
    const { data } = profile.role === 'admin_siege'
      ? await query.limit(50)
      : await query.eq('filiale_vendeur_id', profile.filiale_id).limit(50);
    if (data) setMachines(data as Machine[]);
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Parc Machines</h1>
          <p className="text-slate-600">Suivi des machines vendues et statut terrain</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-5 py-2.5 rounded-lg shadow hover:from-indigo-600 hover:to-blue-700"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter une machine</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">N° Série</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Marque / Modèle</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Pays</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Dernière inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {machines.map((machine) => (
                <tr key={machine.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">{machine.numero_serie}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">{machine.marque}</div>
                    <div className="text-xs text-slate-500">{machine.modele}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900">{machine.client_nom}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {machine.pays}{machine.ville ? ` - ${machine.ville}` : ''}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      {machine.statut}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {machine.date_derniere_inspection
                      ? new Date(machine.date_derniere_inspection).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                </tr>
              ))}
              {machines.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                    Aucune machine enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Ajouter une machine au parc</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Numéro de série</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.numero_serie}
                  onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Marque</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.marque}
                  onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Modèle</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.modele}
                  onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
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
                <label className="text-sm font-medium text-slate-700">Pays</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.pays}
                  onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Ville</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.ville}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Année de fabrication</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.annee_fabrication}
                  onChange={(e) => setFormData({ ...formData, annee_fabrication: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Statut</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.statut}
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                  <option value="Vendu_occasion">Vendu occasion</option>
                  <option value="Hors_service">Hors service</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date de vente</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.date_vente}
                  onChange={(e) => setFormData({ ...formData, date_vente: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Coordonnées GPS</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.coordonnees_gps}
                  onChange={(e) => setFormData({ ...formData, coordonnees_gps: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Commentaires</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={formData.commentaires}
                  onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
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
                onClick={submit}
                disabled={submitLoading || !formData.numero_serie}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold shadow hover:from-indigo-600 hover:to-blue-700 disabled:opacity-60"
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
