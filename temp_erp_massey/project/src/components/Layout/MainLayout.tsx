import { useState, ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  LogOut,
  Menu,
  X,
  BarChart3,
  Truck,
  FileText,
  Wrench,
  DollarSign,
  MapPin,
  Target,
  ClipboardList
} from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
}

export function MainLayout({ children, currentView, onViewChange }: MainLayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['all'] },
    { id: 'kpis', label: 'KPIs & Reporting', icon: BarChart3, roles: ['all'] },
    { id: 'plan-actions', label: 'Plan d\'Actions', icon: ClipboardList, roles: ['all'] },
    { id: 'pdm', label: 'Plans de Marché', icon: Target, roles: ['manager_filiale', 'admin_siege'] },
    { id: 'forecasts', label: 'Prévisions (Forecasts)', icon: TrendingUp, roles: ['manager_filiale', 'admin_siege', 'commercial'] },
    { id: 'visites-clients', label: 'Visites & Opportunités', icon: Users, roles: ['commercial', 'manager_filiale', 'admin_siege'] },
    { id: 'stocks', label: 'Gestion des Stocks', icon: Package, roles: ['all'] },
    { id: 'commandes', label: 'Commandes Fournisseurs', icon: Truck, roles: ['all'] },
    { id: 'commandes-clients', label: 'Commandes Clients', icon: ShoppingCart, roles: ['commercial', 'manager_filiale', 'admin_siege'] },
    { id: 'ventes', label: 'Ventes', icon: ShoppingCart, roles: ['all'] },
    { id: 'ventes-perdues', label: 'Ventes Perdues', icon: TrendingUp, roles: ['commercial', 'manager_filiale', 'admin_siege'] },
    { id: 'parc-machines', label: 'Parc Machines', icon: MapPin, roles: ['all'] },
    { id: 'inspections', label: 'Inspections Techniques', icon: Wrench, roles: ['technicien', 'manager_filiale', 'admin_siege'] },
    { id: 'budgets', label: 'Budgets', icon: DollarSign, roles: ['manager_filiale', 'admin_siege'] },
    { id: 'sessions-inter', label: 'Sessions Interfiliales', icon: FileText, roles: ['manager_filiale', 'admin_siege'] },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (item.roles.includes('all')) return true;
    return profile && item.roles.includes(profile.role);
  });

  const getRoleBadge = (role: string) => {
    const badges = {
      admin_siege: { label: 'Admin Siège', color: 'bg-purple-100 text-purple-800' },
      manager_filiale: { label: 'Manager', color: 'bg-blue-100 text-blue-800' },
      commercial: { label: 'Commercial', color: 'bg-green-100 text-green-800' },
      technicien: { label: 'Technicien', color: 'bg-orange-100 text-orange-800' },
      saisie: { label: 'Saisie', color: 'bg-gray-100 text-gray-800' },
    };
    return badges[role as keyof typeof badges] || badges.saisie;
  };

  const roleBadge = profile ? getRoleBadge(profile.role) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:static lg:translate-x-0 inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-transform duration-300 ease-in-out shadow-2xl`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Multi-Filiales
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {profile && (
              <div className="space-y-2">
                <p className="text-sm text-slate-300">
                  {profile.prenom} {profile.nom}
                </p>
                {roleBadge && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                )}
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-700">
            <button
              onClick={signOut}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 px-6 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900 transition"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-4">
              {profile?.filiale_id && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Filiale active</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
