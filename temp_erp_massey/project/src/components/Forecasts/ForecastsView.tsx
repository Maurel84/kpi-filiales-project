import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { TrendingUp, BarChart3, Calendar, Filter } from 'lucide-react';

interface Marque {
  id: string;
  nom: string;
}

interface ForecastSummary {
  marque: string;
  total_2024: number;
  prevision_2026: number;
  evolution: number;
}

export function ForecastsView() {
  const { profile } = useAuth();
  const [marques, setMarques] = useState<Marque[]>([]);
  const [summaries, setSummaries] = useState<ForecastSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarque, setSelectedMarque] = useState<string>('all');
  const [selectedYear] = useState<number>(2026);

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

    const filialeFilter = profile.role === 'admin_siege' ? {} : { filiale_id: profile.filiale_id };

    const [hist2024, prev2026] = await Promise.all([
      supabase
        .from('historique_ventes_modeles')
        .select('marque_id, quantite_vendue, marques(nom)')
        .eq('annee', 2024)
        .match(filialeFilter),

      supabase
        .from('previsions_ventes_modeles')
        .select('marque_id, quantite_prevue, marques(nom)')
        .eq('annee', 2026)
        .match(filialeFilter)
    ]);

    const summaryMap = new Map<string, ForecastSummary>();

    hist2024.data?.forEach(item => {
      const marque = (item.marques as any)?.nom || 'Inconnu';
      if (!summaryMap.has(marque)) {
        summaryMap.set(marque, { marque, total_2024: 0, prevision_2026: 0, evolution: 0 });
      }
      const summary = summaryMap.get(marque)!;
      summary.total_2024 += item.quantite_vendue || 0;
    });

    prev2026.data?.forEach(item => {
      const marque = (item.marques as any)?.nom || 'Inconnu';
      if (!summaryMap.has(marque)) {
        summaryMap.set(marque, { marque, total_2024: 0, prevision_2026: 0, evolution: 0 });
      }
      const summary = summaryMap.get(marque)!;
      summary.prevision_2026 += item.quantite_prevue || 0;
    });

    summaryMap.forEach(summary => {
      if (summary.total_2024 > 0) {
        summary.evolution = ((summary.prevision_2026 - summary.total_2024) / summary.total_2024) * 100;
      }
    });

    setSummaries(Array.from(summaryMap.values()));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const totalPrevisions = summaries.reduce((sum, s) => sum + s.prevision_2026, 0);
  const totalRealise = summaries.reduce((sum, s) => sum + s.total_2024, 0);
  const evolutionGlobale = totalRealise > 0 ? ((totalPrevisions - totalRealise) / totalRealise * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Prévisions (Forecasts)</h1>
          <p className="text-slate-600">
            Analyse des ventes et prévisions par marque
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Réalisé 2024</p>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalRealise}</p>
          <p className="text-sm text-slate-500 mt-1">unités vendues</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Prévision 2026</p>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-emerald-600">{totalPrevisions}</p>
          <p className="text-sm text-slate-500 mt-1">unités prévues</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600">Évolution</p>
            <TrendingUp className={`w-5 h-5 ${evolutionGlobale >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
          </div>
          <p className={`text-3xl font-bold ${evolutionGlobale >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {evolutionGlobale >= 0 ? '+' : ''}{evolutionGlobale.toFixed(1)}%
          </p>
          <p className="text-sm text-slate-500 mt-1">vs 2024</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Prévisions par Marque</h2>
          <div className="flex items-center space-x-2">
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Marque
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  Réalisé 2024
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  Prévision 2026
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  Évolution
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                  Tendance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {summaries.map((summary) => (
                <tr key={summary.marque} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-4">
                    <span className="font-medium text-slate-900">{summary.marque}</span>
                  </td>
                  <td className="py-4 px-4 text-right text-slate-900">
                    {summary.total_2024.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right font-medium text-slate-900">
                    {summary.prevision_2026.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className={`font-semibold ${summary.evolution >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {summary.evolution >= 0 ? '+' : ''}{summary.evolution.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center">
                      {summary.evolution >= 0 ? (
                        <div className="flex items-center space-x-1 text-emerald-600">
                          <TrendingUp className="w-5 h-5" />
                          <span className="text-sm font-medium">Hausse</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-red-600">
                          <TrendingUp className="w-5 h-5 transform rotate-180" />
                          <span className="text-sm font-medium">Baisse</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {summaries.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Aucune donnée de prévision disponible</p>
              <p className="text-sm text-slate-500 mt-2">Les données seront importées prochainement</p>
            </div>
          )}
        </div>
      </div>

      {summaries.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Analyse des prévisions</h3>
              <p className="text-sm text-blue-700 mt-1">
                Les prévisions 2026 sont basées sur l'historique des ventes 2017-2024 et les objectifs budgétaires.
                Les données détaillées par modèle seront disponibles après l'import complet du fichier forecast.csv.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
