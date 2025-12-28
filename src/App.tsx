import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Auth/Login';
import { MainLayout } from './components/Layout/MainLayout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { VentesView } from './components/Ventes/VentesView';
import { StocksView } from './components/Stocks/StocksView';
import { KPIsView } from './components/KPIs/KPIsView';
import { PlanActionsView } from './components/PlanActions/PlanActionsView';
import { ForecastsView } from './components/Forecasts/ForecastsView';
import { PDMView } from './components/PDM/PDMView';
import { CommandesClientsView } from './components/CommandesClients/CommandesClientsView';
import { CommandesFournisseursView } from './components/CommandesFournisseurs/CommandesFournisseursView';
import { VisitesClientsView } from './components/VisitesClients/VisitesClientsView';
import { DocumentsImportsView } from './components/Documents/DocumentsImportsView';
import { PowerBIView } from './components/PowerBI/PowerBIView';
import { VentesPerduesView } from './components/VentesPerdues/VentesPerduesView';
import { ParcMachinesView } from './components/ParcMachines/ParcMachinesView';
import { InspectionsTechniquesView } from './components/Inspections/InspectionsTechniquesView';
import { BudgetsView } from './components/Budgets/BudgetsView';
import { SessionsInterfilialesView } from './components/SessionsInterfiliales/SessionsInterfilialesView';
import { UsersManagementView } from './components/Admin/UsersManagementView';
import { AuthEventsView } from './components/Admin/AuthEventsView';
import { DataExportsView } from './components/Admin/DataExportsView';
import { Loader2 } from 'lucide-react';
import type { Database } from './lib/database.types';

function AppContent() {
  const { user, loading, profile, profileLoading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof localStorage !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', next);
      }
      return next;
    });
  };

  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }

  type Role = Database['public']['Tables']['users_profiles']['Row']['role'];
  const viewAccess: Record<string, Role[] | 'all'> = {
    dashboard: 'all',
    kpis: 'all',
    'plan-actions': 'all',
    pdm: ['manager_filiale', 'admin_siege'],
    forecasts: ['manager_filiale', 'admin_siege', 'commercial'],
    'visites-clients': ['commercial', 'manager_filiale', 'admin_siege'],
    stocks: 'all',
    commandes: 'all',
    'commandes-clients': ['commercial', 'manager_filiale', 'admin_siege'],
    ventes: 'all',
    'ventes-perdues': ['commercial', 'manager_filiale', 'admin_siege'],
    'parc-machines': 'all',
    inspections: ['technicien', 'manager_filiale', 'admin_siege'],
    budgets: ['manager_filiale', 'admin_siege'],
    'sessions-inter': ['manager_filiale', 'admin_siege'],
    'documents-imports': ['admin_siege'],
    'power-bi': ['admin_siege', 'manager_filiale'],
    users: ['admin_siege'],
    'auth-events': ['admin_siege', 'manager_filiale'],
    'data-exports': ['admin_siege'],
  };

  const isViewAllowed = (view: string, role?: Role | null) => {
    const allowed = viewAccess[view];
    if (!allowed) return false;
    if (allowed === 'all') return true;
    if (!role) return false;
    return allowed.includes(role);
  };

  useEffect(() => {
    if (!user) return;
    const role = profile?.role;
    if (!isViewAllowed(currentView, role)) {
      setCurrentView('dashboard');
    }
  }, [currentView, profile?.role, user]);

  useEffect(() => {
    if (!user) return;
    setCurrentView('dashboard');
  }, [user?.id]);

  if (loading) {
    return (
      <div className="relative min-h-screen bg-neutral-950 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-zinc-900 to-neutral-950" />
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="absolute right-[-8rem] bottom-[-6rem] h-96 w-96 rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="relative text-center bg-white/5 border border-white/10 rounded-3xl px-8 py-10 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-900/30">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
          <p className="text-white text-xl font-semibold">Initialisation en cours</p>
          <p className="text-slate-200 text-sm mt-1">Synchronisation de votre espace en temps reel...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!loading && !profileLoading && user && !profile) {
    return (
      <div className="relative min-h-screen bg-slate-100 flex items-center justify-center px-6">
        <div className="max-w-xl w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-slate-900">Profil utilisateur introuvable</h1>
          <p className="text-slate-600 mt-2">
            Votre compte est bien cree, mais le profil metier n'a pas ete trouve dans la base. Merci de contacter l'admin siege.
          </p>
          <div className="mt-6 flex justify-end">
            <button
              onClick={signOut}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Se deconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} />;
      case 'kpis':
        return <KPIsView />;
      case 'plan-actions':
        return <PlanActionsView />;
      case 'pdm':
        return <PDMView />;
      case 'forecasts':
        return <ForecastsView />;
      case 'stocks':
        return <StocksView />;
      case 'ventes':
        return <VentesView />;
      case 'visites-clients':
        return <VisitesClientsView />;
      case 'ventes-perdues':
        return <VentesPerduesView />;
      case 'commandes-clients':
        return <CommandesClientsView />;
      case 'commandes':
        return <CommandesFournisseursView />;
      case 'documents-imports':
        return <DocumentsImportsView />;
      case 'power-bi':
        return <PowerBIView />;
      case 'parc-machines':
        return <ParcMachinesView />;
      case 'inspections':
        return <InspectionsTechniquesView />;
      case 'budgets':
        return <BudgetsView />;
      case 'sessions-inter':
        return <SessionsInterfilialesView />;
      case 'users':
        return <UsersManagementView onNavigate={setCurrentView} />;
      case 'auth-events':
        return <AuthEventsView />;
      case 'data-exports':
        return <DataExportsView />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <MainLayout currentView={currentView} onViewChange={setCurrentView} theme={theme} onToggleTheme={toggleTheme}>
      {renderView()}
    </MainLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
