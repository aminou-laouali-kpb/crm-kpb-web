/** Étapes communes à toutes les procédures (miroir de la table dossier_stages). */
export const DOSSIER_STAGES = [
  { code: 'non_demarre', label: 'Candidature non démarrée', short: 'Non démarrée', phase: 'admission' },
  { code: 'infos_demandees', label: 'Informations demandées', short: 'Infos demandées', phase: 'admission' },
  { code: 'infos_recues', label: 'Informations de candidature reçues', short: 'Infos reçues', phase: 'admission' },
  { code: 'remplissage_en_cours', label: 'Remplissage du formulaire en cours', short: 'Remplissage', phase: 'admission' },
  { code: 'remplissage_termine', label: 'Remplissage du formulaire terminé', short: 'Rempli', phase: 'admission' },
  { code: 'dossier_finalise', label: 'Dossier finalisé / soumis — en attente de réponse', short: 'Soumis', phase: 'admission' },
  { code: 'reponse_recue', label: 'Réponse reçue (admission / bourse)', short: 'Réponse', phase: 'admission' },
  { code: 'visa_demarre', label: 'Procédure visa démarrée — attente des documents', short: 'Visa démarré', phase: 'visa' },
  { code: 'visa_demande', label: 'Visa demandé', short: 'Visa demandé', phase: 'visa' },
  { code: 'visa_resultat', label: 'Visa reçu / refusé', short: 'Visa : résultat', phase: 'visa' },
];

export const STAGE_INDEX = Object.fromEntries(DOSSIER_STAGES.map((s, i) => [s.code, i]));

export const getStage = (code) => DOSSIER_STAGES.find((s) => s.code === code) || DOSSIER_STAGES[0];

/** Étapes qui exigent un résultat au moment du passage. */
export const STAGE_RESULTS = {
  reponse_recue: [
    { value: 'admis', label: 'Admis / lauréat' },
    { value: 'refuse', label: 'Refusé' },
    { value: 'liste_attente', label: 'Liste d’attente' },
  ],
  visa_resultat: [
    { value: 'obtenu', label: 'Visa obtenu' },
    { value: 'refuse', label: 'Visa refusé' },
  ],
};

export const RESULT_LABELS = {
  admis: 'Admis',
  refuse: 'Refusé',
  liste_attente: 'Liste d’attente',
  obtenu: 'Visa obtenu',
};

export const DOSSIER_STATUSES = {
  actif: { label: 'Actif', className: 'bg-emerald-100 text-emerald-800' },
  en_pause: { label: 'En pause', className: 'bg-amber-100 text-amber-800' },
  cloture: { label: 'Clôturé', className: 'bg-slate-200 text-slate-800' },
  abandonne: { label: 'Abandonné', className: 'bg-red-100 text-red-800' },
};

export const PAYMENT_STATUSES = {
  paye: { label: 'Payé', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  partiel: { label: 'Solde dû', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  non_facture: { label: 'Non facturé', className: 'bg-slate-50 text-slate-700 border-slate-200' },
};

export const EVENT_TYPES = {
  creation: { label: 'Création', className: 'bg-slate-100 text-slate-700' },
  stage_change: { label: 'Changement d’étape', className: 'bg-blue-100 text-blue-800' },
  daily_update: { label: 'Point du jour', className: 'bg-emerald-100 text-emerald-800' },
  client_contact: { label: 'Échange client', className: 'bg-violet-100 text-violet-800' },
  note: { label: 'Note', className: 'bg-slate-100 text-slate-700' },
  commercial_note: { label: 'Note commerciale', className: 'bg-orange-100 text-orange-800' },
  blocage: { label: 'Blocage', className: 'bg-red-100 text-red-800' },
  deblocage: { label: 'Déblocage', className: 'bg-emerald-50 text-emerald-700' },
  status_change: { label: 'Statut', className: 'bg-amber-100 text-amber-800' },
  assignment: { label: 'Affectation', className: 'bg-slate-100 text-slate-700' },
  info_update: { label: 'Informations', className: 'bg-slate-100 text-slate-700' },
  payment: { label: 'Paiement', className: 'bg-teal-100 text-teal-800' },
};

/** Entrées qu'un agent peut saisir librement dans le journal. */
export const ENTRY_TYPE_OPTIONS = [
  { value: 'daily_update', label: 'Point du jour' },
  { value: 'client_contact', label: 'Échange avec l’étudiant' },
  { value: 'note', label: 'Note interne' },
];

export const MIN_COMMENT_LENGTH = 10;

export const NIAMEY_TIMEZONE = 'Africa/Niamey';
