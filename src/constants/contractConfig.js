export const DEFAULT_CONTRACT_CONFIG = {
  kpb_forme_juridique: 'SARL',
  kpb_capital: '',
  kpb_rccm: '',
  kpb_siege: 'Niamey, République du Niger',
  kpb_representant: '',
  kpb_fonction: '',
  kpb_email: 'aminou@karatoupourtous.org',
  ville_juridiction: 'Niamey',
  lieu_signature_defaut: 'Niamey',
  version_contrat: 'v1.0',
  nb_tentatives_reorientation: 1,
  delai_reorientation_mois: 12,
  delai_mise_en_demeure_jours: 15,
  delai_accuse_jours: 3,
  delai_decision_jours: 15,
  delai_versement_jours: 30,
  delai_amiable_jours: 30,
  frais_inscription_defaut: 0,
};

export const PROGRAMME_OPTIONS = [
  { value: 'france_ecoles_privees', label: 'France — écoles privées' },
  { value: 'japon_usa_bourses', label: 'Japon / USA — bourses' },
  { value: 'uk_anglais', label: 'UK — anglais' },
  { value: 'visa_general', label: 'Visa général' },
];

export const OBJECTIF_OPTIONS = [
  { value: 'admission', label: 'Admission' },
  { value: 'visa', label: 'Visa' },
  { value: 'admission_visa', label: 'Admission + Visa' },
];

export const PRESTATIONS_ARTICLE_31 = [
  'Évaluation du profil et orientation',
  'Conseil dans le choix des établissements et formations',
  'Aide à la constitution et à la vérification du dossier de candidature',
  'Dépôt ou assistance au dépôt des candidatures',
  'Suivi des candidatures',
  'Assistance à la constitution du dossier de visa et préparation entretien consulaire',
  'Accompagnement logistique de base préalable au départ',
];

export const DEVISE_SYMBOLS = {
  XOF: 'FCFA',
  EUR: '€',
  USD: '$',
};

export const getProgrammeLabel = (value) =>
  PROGRAMME_OPTIONS.find((o) => o.value === value)?.label || value;

export const getObjectifLabel = (value) =>
  OBJECTIF_OPTIONS.find((o) => o.value === value)?.label || value;
