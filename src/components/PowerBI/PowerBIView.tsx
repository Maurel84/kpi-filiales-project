import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BarChart3, Shield, Link2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function PowerBIView() {
  const { profile } = useAuth();
  const [embedUrl, setEmbedUrl] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveConfig = async () => {
    setStatus(null);
    setError(null);
    const { error } = await supabase
      .from('powerbi_configs')
      .upsert({
        id: profile?.id,
        embed_url: embedUrl,
        dataset_id: datasetId,
        workspace_id: workspaceId,
      });
    if (error) {
      setError(error.message);
    } else {
      setStatus('Configuration enregistrée. Renseigne la fonction Edge pour signer les tokens d\'embeds.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="pill bg-emerald-50 text-emerald-700 border border-emerald-100">Microsoft 365 Business Premium</p>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">Power BI</h1>
          <p className="text-slate-600">Centralise la configuration embed (workspace, dataset, URL). La génération du token embed doit se faire via une fonction Edge (service principal Azure AD) non exposée au front.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-600 mt-1" />
          <div>
            <p className="font-semibold text-slate-900">Service Principal</p>
            <p className="text-sm text-slate-600">Utilise un compte applicatif Azure AD (app registration) pour signer les tokens embed. Ne jamais exposer l\'app secret en front.</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
          <Link2 className="w-5 h-5 text-blue-600 mt-1" />
          <div>
            <p className="font-semibold text-slate-900">Dataset + Workspace</p>
            <p className="text-sm text-slate-600">Renseigne workspaceId et datasetId à signer côté Edge. L\'URL embed vient du rapport publié (Power BI Service).</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-purple-600 mt-1" />
          <div>
            <p className="font-semibold text-slate-900">Sources de données</p>
            <p className="text-sm text-slate-600">Tables cibles : ventes, commandes, stocks, KPIs, opportunités. Prévois des vues matérialisées ou export vers un dataset dédié.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Configuration embed</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Workspace ID</label>
            <input
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              placeholder="GUID du workspace"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Dataset ID</label>
            <input
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              placeholder="GUID du dataset"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Embed URL (rapport publié)</label>
            <input
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://app.powerbi.com/reportEmbed?reportId=...&groupId=..."
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveConfig}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow hover:from-emerald-600 hover:to-teal-700"
          >
            Enregistrer la config
          </button>
        </div>

        {status && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            <span>{status}</span>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Preview embed (test)</h3>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Iframe</span>
        </div>
        {embedUrl ? (
          <>
            <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 aspect-video">
              <iframe
                title="Power BI preview"
                src={embedUrl}
                className="absolute inset-0 h-full w-full"
                allow="fullscreen"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-slate-500">
              Ce preview utilise uniquement l&apos;URL embed. Pour un rendu complet, un token embed est requis
              via la fonction Edge.
            </p>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Renseigne une URL embed pour afficher le rapport ici.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <h3 className="text-base font-semibold text-slate-900">Checklist backend (à faire hors front)</h3>
        <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
          <li>Créer une app registration Azure AD (client_id / client_secret) avec accès Power BI.</li>
          <li>Dans Supabase Edge, créer une fonction (ex: `get-embed-token`) qui signe un embed token via l’API Power BI en utilisant la clé service.</li>
          <li>Stocker les secrets (client_secret) en variable d’environnement, jamais en front.</li>
          <li>Option : créer une table `powerbi_configs` (id uuid, embed_url text, dataset_id text, workspace_id text).</li>
        </ul>
      </div>
    </div>
  );
}
