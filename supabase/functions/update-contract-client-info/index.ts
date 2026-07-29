import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ALLOWED_FIELDS = [
  'date_naissance',
  'lieu_naissance',
  'nationalite',
  'piece_identite',
  'adresse',
  'is_minor',
  'representant_legal_nom',
  'representant_legal_lien',
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const rawFields = body?.fields;

    if (token.length < 16 || token.length > 200 || !/^[A-Za-z0-9_-]+$/.test(token)) {
      return json({ error: 'Lien de signature invalide' }, 400);
    }
    if (!rawFields || typeof rawFields !== 'object' || Array.isArray(rawFields)) {
      return json({ error: 'Données invalides' }, 400);
    }

    const fields: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (!(key in rawFields)) continue;
      const value = (rawFields as Record<string, unknown>)[key];
      if (key === 'is_minor') {
        fields[key] = value === true || value === 'true';
        continue;
      }
      if (value === null || value === undefined) continue;
      if (typeof value !== 'string') return json({ error: 'Données invalides' }, 400);
      const trimmed = value.trim();
      if (trimmed.length > 300) return json({ error: 'Données invalides' }, 400);
      if (key === 'date_naissance' && trimmed && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return json({ error: 'Date de naissance invalide' }, 400);
      }
      fields[key] = trimmed;
    }

    const { data, error } = await service.rpc('update_contract_request_client_info', {
      p_token: token,
      p_fields: fields,
    });

    if (error) {
      console.error('update_contract_request_client_info failed', error.message);
      return json({ error: 'Enregistrement impossible' }, 400);
    }

    return json(data);
  } catch (e) {
    console.error('update-contract-client-info error', e);
    return json({ error: 'Erreur serveur' }, 500);
  }
});
