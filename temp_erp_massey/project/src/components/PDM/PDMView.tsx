import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BarChart3, Package, TrendingUp, Filter } from 'lucide-react';

interface Marque {
  id: string;
  nom: string;
}


interface PDMEntry {
  id: string;
  annee: number;
  marque: { nom: string };
  categorie: { nom: string; type_produit: string } | null;
  source_industrie: string | null;
  source_src: string | null;
  objectif_ventes: number;
}

export function PDMView() {
  const { profile } = useAuth();
  const [marques, setMarques] = useState<Marque[]>([]);
  const [pdmEntries, setPdmEntries] = useState<PDMEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarque, setSelectedMarque] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  useEffect(() => {
    loadData();
  }, [profile, selectedMarque, selectedYear]);

  const loadData = async () => {
    if (!profile) return;

    const { data: marquesData } = await supabase
      .from('marques')
      .select('id, nom')
      .eq('actif', true)
      .order('nom');

    if (marquesData) {
      setMarques(marquesData);
    }

    let query = supabase
      .from('pdm_entries')
      .select(`
        id,
        annee,
        source_industrie,
        source_src,
        objectif_ventes,
        marques (nom),
        categories_produits (nom, type_produit)
      `)
      .eq('annee', selectedYear)
      .order('objectif_ventes', { ascending: false });

    if (profile.role !== 'admin_siege' && profile.filiale_id) {
      query = query.eq('filiale_id', profile.filiale_id);
    }

    if (selectedMarque !== 'all') {
      query = query.eq('marque_id', selectedMarque);
    }

    const { data, error } = await query;

    if (!error && data) {
      setPdmEntries(data as any);
    }

    setLoading(false);
  };

  const getTypeProduitBadge = (type: string) => {
    const badges = {
      Chariot: 'bg-blue-100 text-blue-800',
      Telescopique: 'bg-purple-100 text-purple-800',
      Nacelle: 'bg-amber-100 text-amber-800',
      Tracteur: 'bg-green-100 text-green-800',
      Moissonneuse: 'bg-emerald-100 text-emerald-800',
      Reachstacker: 'bg-red-100 text-red-800',
      Terminal_Tractor: 'bg-slate-100 text-slate-800',
      Autre: 'bg-gray-100 text-gray-800',
    };
    return badges[type as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const totalObjectifs = pdmEntries.reduce((sum, entry) => sum + (entry.objectif_ventes || 0), 0);

  const byMarque = pdmEntries.reduce((acc, entry) => {
    const marque = entry.marque.nom;
    acc[marque] = (acc[marque] || 0) + (entry.objectif_ventes || 0);
    return acc;
  }, {} as Record<string, number>);

  const byType = pdmEntries.reduce((acc, entry) => {
    const type = entry.categorie?.type_produit || 'Autre';
    acc[type] = (acc[type] || 0) + (entry.objectif_ventes || 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Plans de Marché (PDM)</h1>
          <p className="text-slate-600">
            Objectifs de ventes par catégorie et marque
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Objectif Total {selectedYear}</p>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalObjectifs}</p>
          <p className="text-sm text-slate-500 mt-1">unités</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Marques actives</p>
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{Object.keys(byMarque).length}</p>
          <p className="text-sm text-slate-500 mt-1">
            {Object.keys(byMarque).join(', ')}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Catégories</p>
            <BarChart3 className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{pdmEntries.length}</p>
          <p className="text-sm text-slate-500 mt-1">entrées PDM</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Objectifs par Catégorie</h2>
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={selectedMarque}
              onChange={(e) => setSelectedMarque(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">Toutes les marques</option>
              {marques.map(m => (
                <option key={m.id} value={m.id}>{m.nom}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Marque
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Catégorie
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Source
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  Objectif
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pdmEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-4">
                    <span className="font-medium text-slate-900">{entry.marque.nom}</span>
                  </td>
                  <td className="py-4 px-4 text-slate-900">
                    {entry.categorie?.nom || '-'}
                  </td>
                  <td className="py-4 px-4">
                    {entry.categorie?.type_produit && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeProduitBadge(entry.categorie.type_produit)}`}>
                        {entry.categorie.type_produit.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600">
                    {entry.source_industrie && (
                      <div>
                        <span className="font-medium">Industrie:</span> {entry.source_industrie}
                      </div>
                    )}
                    {entry.source_src && (
                      <div className="text-xs text-slate-500">
                        <span className="font-medium">SRC:</span> {entry.source_src}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-semibold text-slate-900">
                      {entry.objectif_ventes.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pdmEntries.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Aucun plan de marché pour {selectedYear}</p>
              <p className="text-sm text-slate-500 mt-2">
                Les PDM seront disponibles après configuration des objectifs par marque
              </p>
            </div>
          )}
        </div>
      </div>

      {Object.keys(byType).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Répartition par Type de Produit</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(byType).map(([type, total]) => (
              <div key={type} className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">{type.replace('_', ' ')}</p>
                <p className="text-2xl font-bold text-slate-900">{total}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {((total / totalObjectifs) * 100).toFixed(1)}% du total
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
