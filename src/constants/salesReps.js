/** Default sales reps — used as fallback when DB table is unavailable */
export const DEFAULT_SALES_REPS = [
  { name: 'Josphin', active: true },
  { name: 'Nadia', active: true },
  { name: 'Donald', active: true },
  { name: 'Richard', active: true },
];

export const DEFAULT_SALES_REP_NAMES = DEFAULT_SALES_REPS.map((r) => r.name);
