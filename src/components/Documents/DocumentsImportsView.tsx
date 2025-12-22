import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, CheckCircle2, UploadCloud, Loader2, AlertTriangle } from 'lucide-react';

type DocStatus = 'pending' | 'imported' | 'error';

interface DocItem {
  name: string;
  type: 'budget' | 'stock' | 'commande' | 'vente' | 'pdm' | 'visite' | 'workflow';
  size?: string;
  status: DocStatus;
}

const initialDocs: DocItem[] = [
  { name: 'BUDGET.pdf', type: 'budget', status: 'pending' },
  { name: 'ETAT STOCK.pdf', type: 'stock', status: 'pending' },
  { name: 'ETATS COMMANDES CLIENTS.pdf', type: 'commande', status: 'pending' },
  { name: 'ETATS COMMANDES FOURNISSEURS.pdf', type: 'commande', status: 'pending' },
  { name: 'ETATS DES VENTES.pdf', type: 'vente', status: 'pending' },
  { name: 'PDM KALMAR.pdf', type: 'pdm', status: 'pending' },
  { name: 'PDM MANIYOU.pdf', type: 'pdm', status: 'pending' },
  { name: 'PDM MASSEY FERGUSON.pdf', type: 'pdm', status: 'pending' },
  { name: 'PLAN D\'ACTION.pdf', type: 'workflow', status: 'pending' },
  { name: 'VISITES CLIENTS.pdf', type: 'visite', status: 'pending' },
  { name: 'WORKFLOW.pdf', type: 'workflow', status: 'pending' },
  { name: 'FORECAST.csv', type: 'pdm', status: 'pending' },
];

export function DocumentsImportsView() {
  const { profile } = useAuth();
  const [docs, setDocs] = useState<DocItem[]>(initialDocs);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const markStatus = (name: string, status: DocStatus) => {
    setDocs((prev) => prev.map((d) => (d.name === name ? { ...d, status } : d)));
  };

  const importForecast = async () => {
    setImportMessage(null);
    setImportLoading(true);

    try {
      const invoke = await supabase.functions.invoke('import-forecast', {
        body: { source: 'FORECAST.csv' },
      });
      if (invoke.error) {
        throw new Error(invoke.error.message);
      }
      setImportMessage(invoke.data?.message || 'Import lancé (vérifiez les logs edge).');
      markStatus('FORECAST.csv', 'imported');
    } catch (firstError) {
      try {
        const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-forecast`;
        const serviceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
        const res = await fetch(functionsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(serviceRole ? { Authorization: `Bearer ${serviceRole}` } : {}),
          },
          body: JSON.stringify({ source: 'FORECAST.csv' }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || 'Edge non joignable');
        }
        setImportMessage(json?.message || 'Import déclenché.');
        markStatus('FORECAST.csv', 'imported');
      } catch (error) {
        const msg = error instanceof Error ? error.message : firstError instanceof Error ? firstError.message : 'Edge non joignable';
        setImportMessage(
          `Echec appel edge: ${msg}. Déployez la fonction (supabase functions deploy import-forecast) et vérifiez SUPABASE_URL/ANON_KEY.`
        );
        markStatus('FORECAST.csv', 'error');
      }
    } finally {
      setImportLoading(false);
    }
  };

  if (profile?.role !== 'admin_siege') {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-700">Accès réservé à l\'administrateur siège.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Documents & Imports</h1>
          <p className="text-slate-600">Suivi des PDF opérationnels et déclenchement de l\'import Forecast.</p>
        </div>
        <button
          onClick={importForecast}
          disabled={importLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-3 font-semibold shadow hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
        >
          {importLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
          Lancer l\'import Forecast
        </button>
      </div>

      {importMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {importMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map((doc) => (
          <div key={doc.name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{doc.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{doc.type}</p>
                </div>
              </div>
              {doc.status === 'imported' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {doc.status === 'error' && <AlertTriangle className="w-5 h-5 text-red-500" />}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">{doc.size || 'Taille inconnue'}</span>
              <div className="space-x-2">
                <button
                  onClick={() => markStatus(doc.name, doc.status === 'imported' ? 'pending' : 'imported')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  {doc.status === 'imported' ? 'Marquer en attente' : 'Marquer importé'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
