import { describe, it, expect } from 'vitest';
import {
  renderContract,
  buildContractVars,
  numberToFrenchWords,
  buildRepresentantLegalPhrase,
} from '../renderContract';
import { sha256Hex } from '../contractHash';

describe('renderContract', () => {
  it('replaces placeholders', () => {
    const out = renderContract('Bonjour {{client_nom}}, prix {{prix_total}} {{devise_symbole}}', {
      client_nom: 'Jean Dupont',
      prix_total: '1 500',
      devise_symbole: '€',
    });
    expect(out).toBe('Bonjour Jean Dupont, prix 1 500 €');
  });

  it('replaces missing vars with empty string', () => {
    expect(renderContract('X{{missing}}Y', {})).toBe('XY');
  });
});

describe('numberToFrenchWords', () => {
  it('handles XOF', () => {
    expect(numberToFrenchWords(1500, 'XOF')).toContain('mille');
    expect(numberToFrenchWords(1500, 'XOF')).toContain('francs CFA');
  });

  it('handles EUR', () => {
    expect(numberToFrenchWords(1, 'EUR')).toBe('un euro');
    expect(numberToFrenchWords(2, 'EUR')).toContain('euros');
  });
});

describe('buildRepresentantLegalPhrase', () => {
  it('returns empty for major', () => {
    expect(buildRepresentantLegalPhrase({ is_minor: false })).toBe('');
  });

  it('builds phrase for minor', () => {
    const phrase = buildRepresentantLegalPhrase({
      is_minor: true,
      representant_legal_nom: 'Marie Dupont',
      representant_legal_lien: 'mère',
    });
    expect(phrase).toContain('mineur représenté par Marie Dupont');
    expect(phrase).toContain('mère');
  });
});

describe('buildContractVars', () => {
  it('builds vars with devise symbol', () => {
    const vars = buildContractVars({
      client: {
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        whatsapp: '+22700000000',
        is_minor: false,
      },
      engagement: {
        programme: 'france_ecoles_privees',
        objectif: 'admission_visa',
        devise: 'EUR',
        prix_total: 2500,
        frais_inscription: 100,
        prestations_incluses: ['Orientation'],
        duree_mois: 12,
      },
      config: { kpb_email: 'aminou@karatoupourtous.org', version_contrat: 'v1.0' },
      dateSignature: '21 juillet 2026',
      lieuSignature: 'Niamey',
    });
    expect(vars.client_nom).toBe('Ada Lovelace');
    expect(vars.devise_symbole).toBe('€');
    expect(vars.programme).toContain('France');
    expect(vars.prix_total_lettres).toContain('euro');
  });

  it('maps entity fields into contract vars', () => {
    const vars = buildContractVars({
      client: { first_name: 'Ada', last_name: 'Lovelace', is_minor: false },
      engagement: { devise: 'USD', prix_total: 1000, frais_inscription: 0, programme: 'visa_general', objectif: 'visa' },
      config: {},
      entity: {
        legal_name: 'KPB Global L.L.C.',
        form: 'Limited Liability Company',
        registration_label: 'Registration No.',
        registration_number: '123',
        address: 'Seattle',
        representative: 'Aminou',
        representative_role: 'Manager',
        email: 'aminou@karatoupourtous.org',
        governing_law: 'Washington law',
        jurisdiction: 'King County',
      },
    });
    expect(vars.entity_legal_name).toBe('KPB Global L.L.C.');
    expect(vars.kpb_rccm).toBe('123');
    expect(vars.ville_juridiction).toBe('King County');
    expect(vars.kpb_email).toBe('aminou@karatoupourtous.org');
  });
});

describe('sha256Hex', () => {
  it('is stable for same input', async () => {
    const a = await sha256Hex('contrat exact');
    const b = await sha256Hex('contrat exact');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('changes when text changes', async () => {
    const a = await sha256Hex('contrat A');
    const b = await sha256Hex('contrat B');
    expect(a).not.toBe(b);
  });
});
