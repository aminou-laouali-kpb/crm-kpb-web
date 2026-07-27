import { DEVISE_SYMBOLS, getProgrammeLabel, getObjectifLabel } from '@/constants/contractConfig';

const ONES_FR = [
  '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];
const TENS_FR = [
  '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt',
];

function underHundred(n) {
  if (n < 20) return ONES_FR[n];
  if (n < 70) {
    const ten = Math.floor(n / 10);
    const one = n % 10;
    if (one === 1 && ten !== 8) return `${TENS_FR[ten]}-et-un`;
    return one ? `${TENS_FR[ten]}-${ONES_FR[one]}` : TENS_FR[ten];
  }
  if (n < 80) {
    return n === 71 ? 'soixante-et-onze' : `soixante-${ONES_FR[n - 60]}`;
  }
  if (n === 80) return 'quatre-vingts';
  return `quatre-vingt-${ONES_FR[n - 80]}`;
}

function underThousand(n) {
  if (n < 100) return underHundred(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const hundredWord = h === 1 ? 'cent' : `${ONES_FR[h]} cent`;
  const hundreds = rest === 0 && h > 1 ? `${ONES_FR[h]} cents` : hundredWord;
  return rest ? `${hundreds} ${underHundred(rest)}` : hundreds;
}

export function numberToFrenchWords(amount, devise = 'XOF') {
  const n = Math.round(Number(amount) || 0);
  const currency =
    devise === 'EUR' ? (n > 1 ? 'euros' : 'euro')
      : devise === 'USD' ? (n > 1 ? 'dollars' : 'dollar')
        : (n > 1 ? 'francs CFA' : 'franc CFA');

  if (n === 0) return `zéro ${currency}`;

  const parts = [];
  let remaining = n;

  const billions = Math.floor(remaining / 1_000_000_000);
  remaining %= 1_000_000_000;
  if (billions) {
    parts.push(billions === 1 ? 'un milliard' : `${underThousand(billions)} milliards`);
  }

  const millions = Math.floor(remaining / 1_000_000);
  remaining %= 1_000_000;
  if (millions) {
    parts.push(millions === 1 ? 'un million' : `${underThousand(millions)} millions`);
  }

  const thousands = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousands) {
    parts.push(thousands === 1 ? 'mille' : `${underThousand(thousands)} mille`);
  }

  if (remaining) parts.push(underThousand(remaining));

  return `${parts.join(' ')} ${currency}`;
}

export function formatContractAmount(amount) {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
}

export function renderContract(templateBody, vars = {}) {
  if (!templateBody) return '';
  return templateBody.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key];
    if (value === null || value === undefined) return '';
    return String(value);
  });
}

export function buildRepresentantLegalPhrase(client) {
  if (!client?.is_minor) return '';
  const nom = client.representant_legal_nom?.trim();
  const lien = client.representant_legal_lien?.trim();
  if (!nom) return '';
  if (lien) return `, mineur représenté par ${nom}, en qualité de ${lien}`;
  return `, mineur représenté par ${nom}`;
}

export function buildContractVars({
  client,
  engagement,
  config,
  entity,
  dateSignature,
  lieuSignature,
}) {
  const devise = engagement?.devise || 'XOF';
  const prixTotal = engagement?.prix_total ?? 0;
  const frais = engagement?.frais_inscription ?? config?.frais_inscription_defaut ?? 0;
  const prestations = Array.isArray(engagement?.prestations_incluses)
    ? engagement.prestations_incluses.join('; ')
    : (engagement?.prestations_incluses || '');

  const dateStr = dateSignature
    || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const entityLegalName = entity?.legal_name || 'KPB Education';
  const registrationLabel = entity?.registration_label || 'RCCM';
  const registrationNumber = entity?.registration_number || config?.kpb_rccm || '';
  const entityForm = entity?.form || config?.kpb_forme_juridique || '';
  const entityAddress = entity?.address || config?.kpb_siege || '';
  const entityRep = entity?.representative || config?.kpb_representant || '';
  const entityRole = entity?.representative_role || config?.kpb_fonction || '';
  const entityEmail = entity?.email || config?.kpb_email || '';
  const jurisdiction = entity?.jurisdiction || config?.ville_juridiction || 'Niamey';
  const governingLaw = entity?.governing_law
    || 'Droit en vigueur en République du Niger et Actes uniformes OHADA';

  return {
    client_nom: `${client?.first_name || ''} ${client?.last_name || ''}`.trim(),
    client_date_naissance: client?.date_naissance
      ? new Date(client.date_naissance).toLocaleDateString('fr-FR')
      : '',
    client_lieu_naissance: client?.lieu_naissance || '',
    client_nationalite: client?.nationalite || '',
    client_piece_identite: client?.piece_identite || '',
    client_adresse: client?.adresse || '',
    client_telephone: client?.whatsapp || '',
    client_email: client?.email || '',
    client_representant_legal: buildRepresentantLegalPhrase(client),

    // Entity-driven (preferred) + legacy kpb_* aliases for older templates
    entity_legal_name: entityLegalName,
    entity_form: entityForm,
    entity_registration_label: registrationLabel,
    entity_registration_number: registrationNumber,
    entity_state: entity?.state_of_incorporation || '',
    entity_address: entityAddress,
    entity_representative: entityRep,
    entity_representative_role: entityRole,
    entity_email: entityEmail,
    entity_governing_law: governingLaw,
    entity_jurisdiction: jurisdiction,

    kpb_forme_juridique: entityForm,
    kpb_capital: config?.kpb_capital || '',
    kpb_rccm: registrationNumber,
    kpb_siege: entityAddress,
    kpb_representant: entityRep,
    kpb_fonction: entityRole,
    kpb_email: entityEmail,

    programme: getProgrammeLabel(engagement?.programme),
    objectif: getObjectifLabel(engagement?.objectif),
    etablissements_cibles: engagement?.etablissements_cibles || '',
    prestations_incluses: prestations,
    prix_total: formatContractAmount(prixTotal),
    prix_total_lettres: numberToFrenchWords(prixTotal, devise),
    frais_inscription: formatContractAmount(frais),
    echeancier: engagement?.echeancier || '',
    duree_mois: engagement?.duree_mois ?? '',
    devise,
    devise_symbole: DEVISE_SYMBOLS[devise] || devise,

    nb_tentatives_reorientation: config?.nb_tentatives_reorientation ?? 1,
    delai_reorientation_mois: config?.delai_reorientation_mois ?? 12,
    delai_mise_en_demeure_jours: config?.delai_mise_en_demeure_jours ?? 15,
    delai_accuse_jours: config?.delai_accuse_jours ?? 3,
    delai_decision_jours: config?.delai_decision_jours ?? 15,
    delai_versement_jours: config?.delai_versement_jours ?? 30,
    delai_amiable_jours: config?.delai_amiable_jours ?? 30,
    ville_juridiction: jurisdiction,

    lieu_signature: lieuSignature || config?.lieu_signature_defaut || jurisdiction || 'Niamey',
    date_signature: dateStr,
    version_contrat: config?.version_contrat || 'v1.0',
  };
}
