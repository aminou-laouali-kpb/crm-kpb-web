import { describe, it, expect } from 'vitest';
import { extractArticles, formatEngagementAmount } from '@/utils/contractSections';
import { buildContractMessage, contractsToFollowUp, daysSinceLastTouch, getContractState } from '@/utils/contracts';
import contractTemplate from '@/content/contract_v1.md?raw';

describe('extractArticles', () => {
  it('extrait les articles 7 et 9 du vrai contrat, sans les autres', () => {
    const md = extractArticles(contractTemplate, [7, 9]);
    expect(md).toMatch(/^### Article 7/);
    expect(md).toContain('Politique de remboursement');
    expect(md).toContain('### Article 9 — Résiliation');
    expect(md).not.toContain('### Article 8');
    expect(md).not.toContain('### Article 10');
    expect(md).not.toContain('ANNEXE');
  });

  it('renvoie une chaîne vide sans contrat', () => {
    expect(extractArticles('', [7])).toBe('');
  });
});

describe('formatEngagementAmount', () => {
  it('formate le prix avec la devise', () => {
    expect(formatEngagementAmount(500000, 'XOF')).toBe('500 000 FCFA');
    expect(formatEngagementAmount('1200', 'EUR')).toBe('1 200 €');
    expect(formatEngagementAmount(null, 'XOF')).toBeNull();
  });
});

describe('contrats', () => {
  it('message d’envoi puis de relance', () => {
    const first = buildContractMessage({ firstName: 'Awa', url: 'https://x/contrat/abc' });
    expect(first).toContain('Bonjour Awa');
    expect(first).toContain('https://x/contrat/abc');
    expect(first).toContain('Remboursement et désistement');
    expect(buildContractMessage({ firstName: 'Awa', url: 'u', reminder: true })).toContain('rappel');
  });

  it('liste à relancer : non signés, plus ancien envoi en premier', () => {
    const rows = [
      { invoice_id: 'a', contract_state: 'signe', sent_at: '2026-10-01' },
      { invoice_id: 'b', contract_state: 'envoye', sent_at: '2026-10-10' },
      { invoice_id: 'c', contract_state: 'non_envoye', invoice_created_at: '2026-10-05' },
    ];
    expect(contractsToFollowUp(rows).map((r) => r.invoice_id)).toEqual(['c', 'b']);
  });

  it('jours depuis le dernier envoi ou la dernière relance', () => {
    const now = new Date('2026-10-17T12:00:00Z');
    expect(daysSinceLastTouch({ sent_at: '2026-10-14T12:00:00Z' }, now)).toBe(3);
    expect(daysSinceLastTouch({ sent_at: '2026-10-10T12:00:00Z', last_reminded_at: '2026-10-16T12:00:00Z' }, now)).toBe(1);
    expect(daysSinceLastTouch({}, now)).toBeNull();
  });

  it('état inconnu = non envoyé', () => {
    expect(getContractState('xxx').label).toBe('Contrat non envoyé');
  });
});
