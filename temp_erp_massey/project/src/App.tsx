import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
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
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Ventes Perdues</h2>
            <p className="text-slate-600">Module en développement</p>
          </div>
        );
      case 'commandes-clients':
        return <CommandesClientsView />;
      case 'commandes':
        return <CommandesFournisseursView />;
      case 'parc-machines':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Parc Machines</h2>
            <p className="text-slate-600">Module en développement</p>
          </div>
        );
      case 'inspections':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Inspections Techniques</h2>
            <p className="text-slate-600">Module en développement</p>
          </div>
        );
      case 'budgets':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Budgets</h2>
            <p className="text-slate-600">Module en développement</p>
          </div>
        );
      case 'sessions-inter':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Sessions Interfiliales</h2>
            <p className="text-slate-600">Module en développement</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <MainLayout currentView={currentView} onViewChange={setCurrentView}>
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
