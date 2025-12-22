// Edge Function: get-embed-token
// Génère un token d'embed Power BI via un service principal Azure AD.
// Variables d'environnement requises (dans Supabase, pas en front) :
// - AZURE_TENANT_ID
// - PBI_CLIENT_ID
// - PBI_CLIENT_SECRET
// - PBI_WORKSPACE_ID
// - PBI_REPORT_ID
// - PBI_DATASET_ID
// - POWERBI_SCOPE (optionnel, défaut: https://analysis.windows.net/powerbi/api/.default)

interface TokenRequestBody {
  workspaceId?: string;
  reportId?: string;
  datasetId?: string;
  accessLevel?: 'View' | 'Edit' | 'Create';
}

const tenantId = Deno.env.get('AZURE_TENANT_ID') ?? '';
const clientId = Deno.env.get('PBI_CLIENT_ID') ?? '';
const clientSecret = Deno.env.get('PBI_CLIENT_SECRET') ?? '';
const defaultWorkspaceId = Deno.env.get('PBI_WORKSPACE_ID') ?? '';
const defaultReportId = Deno.env.get('PBI_REPORT_ID') ?? '';
const defaultDatasetId = Deno.env.get('PBI_DATASET_ID') ?? '';
const scope =
  Deno.env.get('POWERBI_SCOPE') ?? 'https://analysis.windows.net/powerbi/api/.default';

async function getAzureAccessToken() {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  });
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }
  );
  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Azure token error: ${errText}`);
  }
  return tokenRes.json() as Promise<{ access_token: string }>;
}

async function generateEmbedToken(
  accessToken: string,
  workspaceId: string,
  reportId: string,
  datasetId: string,
  accessLevel: 'View' | 'Edit' | 'Create' = 'View'
) {
  const url = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`;
  const body = {
    datasets: [{ id: datasetId }],
    reports: [{ id: reportId }],
    targetWorkspaces: [{ id: workspaceId }],
    accessLevel,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Power BI embed error: ${errText}`);
  }
  return res.json() as Promise<{ token: string; expiration: string }>;
}

export default async (req: Request) => {
  try {
    const body = (await req.json().catch(() => ({}))) as TokenRequestBody;

    const workspaceId = body.workspaceId || defaultWorkspaceId;
    const reportId = body.reportId || defaultReportId;
    const datasetId = body.datasetId || defaultDatasetId;
    const accessLevel = body.accessLevel || 'View';

    if (!tenantId || !clientId || !clientSecret || !workspaceId || !reportId || !datasetId) {
      return new Response(
        JSON.stringify({ error: 'Missing env vars for Power BI embed configuration' }),
        { status: 400 }
      );
    }

    const { access_token } = await getAzureAccessToken();
    const embedToken = await generateEmbedToken(access_token, workspaceId, reportId, datasetId, accessLevel);

    return new Response(JSON.stringify({ token: embedToken.token, expiresAt: embedToken.expiration }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
};
