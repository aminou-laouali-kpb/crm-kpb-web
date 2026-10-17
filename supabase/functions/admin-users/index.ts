// Gestion des comptes par un administrateur : création (mot de passe provisoire),
// activation / désactivation, réinitialisation du mot de passe.
// Les droits (rôles, commercial, périmètre) passent par la RPC admin_update_user_access.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const service = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    // Client agissant au nom de l'appelant : les RPC vérifient elles-mêmes le rôle admin
    const caller = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: access, error: accessError } = await caller.rpc('get_my_access');
    const callerRoles: string[] = access?.roles || [];
    if (accessError || !callerRoles.includes('admin') || access?.profile?.is_active === false) {
      return json({ error: 'Réservé aux administrateurs' }, 403);
    }

    const body = await req.json();

    if (body.action === 'create_user') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!EMAIL_RE.test(email)) return json({ error: 'Email invalide' }, 400);
      if (password.length < MIN_PASSWORD_LENGTH) {
        return json({ error: `Mot de passe : ${MIN_PASSWORD_LENGTH} caractères minimum` }, 400);
      }

      const { data: created, error: createError } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: body.full_name || '' },
      });
      if (createError) {
        const exists = /already|registered|exists/i.test(createError.message);
        return json({ error: exists ? 'Un compte existe déjà avec cet email' : 'Création du compte impossible' }, 400);
      }

      const { error: rpcError } = await caller.rpc('admin_update_user_access', {
        p_user_id: created.user.id,
        p_roles: body.roles || [],
        p_full_name: body.full_name || null,
        p_sales_rep_id: body.sales_rep_id || null,
        p_procedure_scope: body.procedure_scope?.length ? body.procedure_scope : null,
        p_is_active: true,
      });
      if (rpcError) {
        // Pas de compte à moitié configuré
        await service.auth.admin.deleteUser(created.user.id);
        return json({ error: rpcError.message }, 400);
      }

      return json({ ok: true, user_id: created.user.id });
    }

    if (body.action === 'set_active') {
      const userId = String(body.user_id || '');
      const isActive = body.is_active === true;
      if (!userId) return json({ error: 'user_id requis' }, 400);
      if (userId === access.user_id && !isActive) {
        return json({ error: 'Vous ne pouvez pas désactiver votre propre compte' }, 400);
      }

      const { error: banError } = await service.auth.admin.updateUserById(userId, {
        ban_duration: isActive ? 'none' : '876000h',
      });
      if (banError) return json({ error: 'Mise à jour du compte impossible' }, 400);

      const { error: profileError } = await service
        .from('profiles')
        .upsert({ user_id: userId, is_active: isActive, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (profileError) return json({ error: 'Mise à jour du profil impossible' }, 400);

      await service.from('audit_logs').insert({
        user_id: access.user_id,
        action: 'UPDATE',
        table_name: 'user_roles',
        record_id: userId,
        metadata: { is_active: isActive },
      });

      return json({ ok: true });
    }

    if (body.action === 'reset_password') {
      const userId = String(body.user_id || '');
      const password = String(body.password || '');
      if (!userId) return json({ error: 'user_id requis' }, 400);
      if (password.length < MIN_PASSWORD_LENGTH) {
        return json({ error: `Mot de passe : ${MIN_PASSWORD_LENGTH} caractères minimum` }, 400);
      }
      const { error } = await service.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: 'Réinitialisation impossible' }, 400);
      return json({ ok: true });
    }

    return json({ error: 'Action inconnue' }, 400);
  } catch (e) {
    console.error('admin-users error:', e);
    return json({ error: 'Erreur interne' }, 500);
  }
});
