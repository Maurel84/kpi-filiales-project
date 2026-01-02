import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useFilialeContext } from '../../contexts/FilialeContext';
import type { Database } from '../../lib/database.types';
import { ModalTabs } from '../ui/ModalTabs';

type Inspection = Database['public']['Tables']['inspections_techniques']['Row'];
type Machine = Pick<Database['public']['Tables']['parc_machines']['Row'], 'id' | 'numero_serie' | 'marque' | 'modele' | 'client_nom'>;
type Technicien = Pick<Database['public']['Tables']['users_profiles']['Row'], 'id' | 'prenom' | 'nom' | 'email' | 'filiale_id'>;
const today = () => new Date().toISOString().slice(0, 10);

export function InspectionsTechniquesView() {
  const { profile } = useAuth();
  const { filialeId, isAdmin } = useFilialeContext();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [techniciens, setTechniciens] = useState<Technicien[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'infos' | 'diagnostic' | 'devis'>('infos');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    numero: '',
    machine_id: '',
    technicien_id: '',
    date_inspection: today(),
    type_inspection: 'Maintenance',
    heures_compteur: '',
    anomalies_detectees: '',
    pieces_recommandees: '',
    devis_genere: false,
    montant_devis: '',
    statut_devis: 'A_etablir',
    commentaires: '',
  });

  useEffect(() => {
    const load = async () => {
      if (!profile) return;

      const query = supabase.from('inspections_techniques').select('*').order('date_inspection', { ascending: false });
      if (!isAdmin && !filialeId) {
        setInspections([]);
        setLoading(false);
        return;
      }
      if (filialeId) {
        const { data, error } = await query.eq('filiale_id', filialeId).limit(50);
        if (!error && data) setInspections(data as Inspection[]);
        setLoading(false);
        return;
      }
      const { data, error } = await query.limit(50);
      if (!error && data) setInspections(data as Inspection[]);
      setLoading(false);
    };
    load();
  }, [filialeId, isAdmin, profile]);

  useEffect(() => {
    const loadLookups = async () => {
      if (!profile) return;


      let machineQuery = supabase
        .from('parc_machines')
        .select('id, numero_serie, marque, modele, client_nom')
        .order('numero_serie');
      if (filialeId) {
        machineQuery = machineQuery.eq('filiale_vendeur_id', filialeId);
      }
      const techQueryBase = supabase
        .from('users_profiles')
        .select('id, prenom, nom, email, filiale_id')
        .eq('role', 'technicien')
        .eq('actif', true)
        .order('nom');
      const techQuery = filialeId ? techQueryBase.eq('filiale_id', filialeId) : techQueryBase;

      const [{ data: machinesData }, { data: techsData }] = await Promise.all([machineQuery, techQuery]);
      if (machinesData) setMachines(machinesData as Machine[]);
      if (techsData) setTechniciens(techsData as Technicien[]);
    };
    loadLookups();
  }, [filialeId, isAdmin, profile]);

  const getMachineLabel = (machine: Machine) => {
    const base = [machine.marque, machine.modele].filter(Boolean).join(' ');
    const serial = machine.numero_serie ? `S/N ${machine.numero_serie}` : '';
    const client = machine.client_nom ? `- ${machine.client_nom}` : '';
    return [base, serial, client].filter(Boolean).join(' ').trim() || machine.numero_serie || 'Machine';
  };

  const getTechnicienLabel = (tech: Technicien) => {
    return (
      [tech.prenom, tech.nom].filter(Boolean).join(' ').trim() ||
      tech.email ||
      'Technicien'
    );
  };

  const machineLabelMap = useMemo(() => {
    return new Map(machines.map((machine) => [machine.id, getMachineLabel(machine)]));
  }, [machines]);

  const submit = async () => {
    if (!profile) return;
    if (!filialeId) {
      setSubmitError('Associez une filiale au profil pour créer une inspection.');
      return;
    }
    if (!formData.numero || !formData.machine_id) {
      setSubmitError('Numéro et machine sont requis.');
      return;
    }
    setSubmitError('');
    setSubmitLoading(true);
    const payload = {
      numero: formData.numero,
      machine_id: formData.machine_id,
      filiale_id: filialeId,
      technicien_id: formData.technicien_id || profile.id,
      date_inspection: formData.date_inspection || today(),
      type_inspection: formData.type_inspection as Inspection['type_inspection'],
      heures_compteur: formData.heures_compteur ? Number(formData.heures_compteur) : null,
      anomalies_detectees: formData.anomalies_detectees
        ? formData.anomalies_detectees.split(',').map((a) => a.trim())
        : null,
      pieces_recommandees: formData.pieces_recommandees
        ? formData.pieces_recommandees.split(',').map((a) => a.trim())
        : null,
      devis_genere: formData.devis_genere,
      montant_devis: formData.montant_devis ? Number(formData.montant_devis) : null,
      statut_devis: formData.statut_devis as Inspection['statut_devis'],
      commentaires: formData.commentaires || null,
    };
    const { error } = await supabase.from('inspections_techniques').insert(payload);
    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }
    setSubmitLoading(false);
    setIsModalOpen(false);
    setFormData({ ...formData, numero: '', machine_id: '', anomalies_detectees: '', pieces_recommandees: '', commentaires: '' });
    const query = supabase.from('inspections_techniques').select('*').order('date_inspection', { ascending: false });
    const { data } = filialeId
      ? await query.eq('filiale_id', filialeId).limit(50)
      : await query.limit(50);
    if (data) setInspections(data as Inspection[]);
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Inspections Techniques</h1>
          <p className="text-slate-600">Suivi des diagnostics et devis générés</p>
        </div>
        <button
          onClick={() => {
            setSubmitError('');
            setIsModalOpen(true);
            setModalTab('infos');
          }}
          className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-2.5 rounded-lg shadow hover:from-amber-600 hover:to-orange-700"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle inspection</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Numéro</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Machine</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Devis</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Statut devis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {inspections.map((ins) => (
                <tr key={ins.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">{ins.numero}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">
                    {machineLabelMap.get(ins.machine_id) || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {ins.date_inspection ? new Date(ins.date_inspection).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">{ins.type_inspection || '—'}</td>
                  <td className="py-3 px-4 text-sm text-slate-900">
                    {ins.devis_genere ? `${ins.montant_devis || 0} XAF` : 'Non généré'}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      {ins.statut_devis || 'A_etablir'}
                    </span>
                  </td>
                </tr>
              ))}
              {inspections.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                    Aucune inspection saisie.
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

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Nouvelle inspection</h2>
            <ModalTabs
              tabs={[
                { id: 'infos', label: 'Infos' },
                { id: 'diagnostic', label: 'Diagnostic' },
                { id: 'devis', label: 'Devis' },
              ]}
              activeTab={modalTab}
              onChange={(key) => setModalTab(key as typeof modalTab)}
            />
            {modalTab === 'infos' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Numero</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Machine</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.machine_id}
                    onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                  >
                    <option value="">Selectionner une machine</option>
                    {machines.map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {getMachineLabel(machine)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Technicien</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.technicien_id}
                    onChange={(e) => setFormData({ ...formData, technicien_id: e.target.value })}
                  >
                    <option value="">Moi (profil connecte)</option>
                    {techniciens.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {getTechnicienLabel(tech)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Date d'inspection</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.date_inspection}
                    onChange={(e) => setFormData({ ...formData, date_inspection: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Type</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.type_inspection}
                    onChange={(e) => setFormData({ ...formData, type_inspection: e.target.value })}
                  >
                    <option value="Maintenance">Maintenance</option>
                    <option value="Reparation">Reparation</option>
                    <option value="Diagnostic">Diagnostic</option>
                    <option value="Garantie">Garantie</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Heures compteur</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.heures_compteur}
                    onChange={(e) => setFormData({ ...formData, heures_compteur: e.target.value })}
                  />
                </div>
              </div>
            )}
            {modalTab === 'diagnostic' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Anomalies detectees (separees par ,)</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.anomalies_detectees}
                    onChange={(e) => setFormData({ ...formData, anomalies_detectees: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Pieces recommandees (separees par ,)</label>
                  <input
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.pieces_recommandees}
                    onChange={(e) => setFormData({ ...formData, pieces_recommandees: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Commentaires</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.commentaires}
                    onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            )}
            {modalTab === 'devis' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Devis genere ?</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.devis_genere ? 'oui' : 'non'}
                    onChange={(e) => setFormData({ ...formData, devis_genere: e.target.value === 'oui' })}
                  >
                    <option value="non">Non</option>
                    <option value="oui">Oui</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Montant devis</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.montant_devis}
                    onChange={(e) => setFormData({ ...formData, montant_devis: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Statut devis</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={formData.statut_devis}
                    onChange={(e) => setFormData({ ...formData, statut_devis: e.target.value })}
                  >
                    <option value="A_etablir">A etablir</option>
                    <option value="Envoye">Envoye</option>
                    <option value="Accepte">Accepte</option>
                    <option value="Refuse">Refuse</option>
                    <option value="Null">Null</option>
                  </select>
                </div>
              </div>
            )}

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
                disabled={submitLoading || !formData.numero}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow hover:from-amber-600 hover:to-orange-700 disabled:opacity-60"
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





