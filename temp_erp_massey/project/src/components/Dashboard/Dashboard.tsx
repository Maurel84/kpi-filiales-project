import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Package,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';

interface Stats {
  totalVentes: number;
  montantVentes: number;
  stockItems: number;
  stockObsolete: number;
  kpisPending: number;
  ventesMonth: number;
}

export function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalVentes: 0,
    montantVentes: 0,
    stockItems: 0,
    stockObsolete: 0,
    kpisPending: 0,
    ventesMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [profile]);

  const loadStats = async () => {
    if (!profile) return;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const isAdmin = profile.role === 'admin_siege';
    const filialeFilter = isAdmin ? {} : { filiale_id: profile.filiale_id };

    const [ventesRes, stockRes, kpisRes, ventesMonthRes] = await Promise.all([
      supabase
        .from('ventes')
        .select('prix_vente_ht')
        .eq('statut', 'Facturee')
        .match(filialeFilter),

      supabase
        .from('stock_items')
        .select('id, date_entree')
        .match(filialeFilter),

      supabase
        .from('kpis_reporting')
        .select('id')
        .in('status', ['Draft', 'Submitted'])
        .match(filialeFilter),

      supabase
        .from('ventes')
        .select('prix_vente_ht')
        .eq('statut', 'Facturee')
        .gte('date_vente', `${currentMonth}-01`)
        .match(filialeFilter)
    ]);

    const totalVentes = ventesRes.data?.length || 0;
    const montantVentes = ventesRes.data?.reduce((sum, v) => sum + (v.prix_vente_ht || 0), 0) || 0;
    const stockItems = stockRes.data?.length || 0;

    const stockObsolete = stockRes.data?.filter(item => {
      const monthsOld = Math.floor(
        (Date.now() - new Date(item.date_entree).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      return monthsOld > 12;
    }).length || 0;

    const kpisPending = kpisRes.data?.length || 0;
    const ventesMonth = ventesMonthRes.data?.length || 0;

    setStats({
      totalVentes,
      montantVentes,
      stockItems,
      stockObsolete,
      kpisPending,
      ventesMonth,
    });

    setLoading(false);
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    subtitle?: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Tableau de bord
        </h1>
        <p className="text-slate-600">
          Vue d'ensemble de votre activité
          {profile?.role !== 'admin_siege' && ' - Filiale'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ventes totales"
          value={stats.totalVentes}
          icon={ShoppingCart}
          color="bg-gradient-to-br from-emerald-500 to-teal-600"
          subtitle={`${stats.ventesMonth} ce mois`}
        />

        <StatCard
          title="Chiffre d'affaires"
          value={`${Math.round(stats.montantVentes).toLocaleString()} €`}
          icon={DollarSign}
          color="bg-gradient-to-br from-blue-500 to-indigo-600"
        />

        <StatCard
          title="Articles en stock"
          value={stats.stockItems}
          icon={Package}
          color="bg-gradient-to-br from-amber-500 to-orange-600"
          subtitle={stats.stockObsolete > 0 ? `${stats.stockObsolete} obsolètes` : undefined}
        />

        <StatCard
          title="KPIs en attente"
          value={stats.kpisPending}
          icon={Clock}
          color="bg-gradient-to-br from-purple-500 to-pink-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-emerald-600" />
            Actions rapides
          </h2>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition">
              <p className="font-medium text-slate-900">Nouvelle vente</p>
              <p className="text-sm text-slate-600">Enregistrer une vente</p>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition">
              <p className="font-medium text-slate-900">Saisir un KPI</p>
              <p className="text-sm text-slate-600">Ajouter des données de reporting</p>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition">
              <p className="font-medium text-slate-900">Gérer le stock</p>
              <p className="text-sm text-slate-600">Consulter et modifier le stock</p>
            </button>
          </div>
        </div>

        {stats.stockObsolete > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-amber-600" />
              Alertes
            </h2>
            <div className="space-y-3">
              <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="font-medium text-amber-900">Stock obsolète</p>
                <p className="text-sm text-amber-700">
                  {stats.stockObsolete} article(s) en stock depuis plus de 12 mois
                </p>
              </div>
              {stats.kpisPending > 0 && (
                <div className="px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="font-medium text-blue-900">KPIs en attente</p>
                  <p className="text-sm text-blue-700">
                    {stats.kpisPending} KPI(s) nécessitent une validation
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
