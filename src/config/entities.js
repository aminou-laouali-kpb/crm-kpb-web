/**
 * Entités contractantes paramétrables.
 * Ne pas coder une seule entité en dur — figée dans le snapshot au moment de la signature.
 * Champs juridiques à compléter avant mise en production (voir spec Signature Lien).
 */

export const ENTITY_KEYS = /** @type {const} */ (['kpb_global_llc', 'kpb_education_ne']);

/** @typedef {'kpb_global_llc' | 'kpb_education_ne'} EntityKey */

/**
 * @typedef {Object} ContractEntity
 * @property {string} legal_name
 * @property {string} form
 * @property {string} registration_label
 * @property {string} registration_number
 * @property {string} state_of_incorporation
 * @property {string} address
 * @property {string} representative
 * @property {string} representative_role
 * @property {string} email
 * @property {string} governing_law
 * @property {string} jurisdiction
 * @property {string} [label]
 */

/** @type {Record<EntityKey, ContractEntity & { label: string }>} */
export const ENTITIES = {
  kpb_global_llc: {
    label: 'KPB Global L.L.C.',
    legal_name: 'KPB Global L.L.C.',
    form: 'Limited Liability Company',
    registration_label: 'Registration No.',
    registration_number: '', // À COMPLÉTER
    state_of_incorporation: '', // À COMPLÉTER (ex. Washington)
    address: '', // À COMPLÉTER
    representative: '',
    representative_role: '',
    email: 'aminou@karatoupourtous.org',
    governing_law: '', // aligner avec l'Article 14
    jurisdiction: '',
  },
  kpb_education_ne: {
    label: 'KPB Education (Niger)',
    legal_name: 'KPB Education',
    form: 'SARL',
    registration_label: 'RCCM',
    registration_number: '',
    state_of_incorporation: 'République du Niger',
    address: '', // Niamey
    representative: '',
    representative_role: '',
    email: 'aminou@karatoupourtous.org',
    governing_law: 'Droit en vigueur en République du Niger et Actes uniformes OHADA',
    jurisdiction: 'Niamey',
  },
};

export const DEFAULT_ENTITY_KEY = /** @type {EntityKey} */ ('kpb_education_ne');

/** @param {string} key */
export function getEntity(key) {
  if (key && ENTITIES[key]) return ENTITIES[key];
  return ENTITIES[DEFAULT_ENTITY_KEY];
}

export const ENTITY_OPTIONS = ENTITY_KEYS.map((key) => ({
  value: key,
  label: ENTITIES[key].label,
}));
