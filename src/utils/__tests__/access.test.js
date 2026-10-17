import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

const { deriveAccess } = await import('@/hooks/useAccess');

describe('deriveAccess', () => {
  it('commercial : partie commerciale, pas limité aux dossiers', () => {
    const a = deriveAccess({ roles: ['commercial'], profile: { is_active: true, sales_rep_name: 'Nadia' } });
    expect(a.hasCommercialSide).toBe(true);
    expect(a.isDossierOnly).toBe(false);
    expect(a.linkedSalesRep).toBe('Nadia');
  });

  it('agent / contractuel : uniquement l’espace Dossiers, avec périmètre', () => {
    const a = deriveAccess({
      roles: ['contractuel'],
      profile: { is_active: true, procedure_scope: ['france_privee', 'campus_france'] },
    });
    expect(a.isDossierOnly).toBe(true);
    expect(a.procedureScope).toEqual(['france_privee', 'campus_france']);
  });

  it('admin + agent garde l’accès complet', () => {
    expect(deriveAccess({ roles: ['admin', 'agent'], profile: null }).isDossierOnly).toBe(false);
  });

  it('compte sans rôle ou désactivé : aucun accès', () => {
    expect(deriveAccess({ roles: [], profile: null }).hasAnyRole).toBe(false);
    const inactive = deriveAccess({ roles: ['admin'], profile: { is_active: false } });
    expect(inactive.hasAnyRole).toBe(false);
    expect(inactive.isAdmin).toBe(false);
  });

  it('périmètre vide = tous les dossiers', () => {
    expect(deriveAccess({ roles: ['agent'], profile: { procedure_scope: [] } }).procedureScope).toBeNull();
  });
});
