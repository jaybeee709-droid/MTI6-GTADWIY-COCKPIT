/**
 * The 12 persistent Tribe principals — canonical identities only
 * (id + display name, mirroring js/tribe-principals.js in the web
 * cockpit). STAR sits above the principals; Angels are a separate
 * registry and are never Tribe members.
 *
 * Identities are permanent. Roles/tasks are assignments, and no
 * assignment or worker state is shown in Build 1: the worker runtime
 * is not connected, so nothing here claims activity.
 */
export interface TribePrincipal {
  id: string;
  displayName: string;
}

export const tribePrincipals: TribePrincipal[] = [
  { id: 'tribe-judah', displayName: 'JUDAH' },
  { id: 'tribe-reuben', displayName: 'REUBEN' },
  { id: 'tribe-gad', displayName: 'GAD' },
  { id: 'tribe-asher', displayName: 'ASHER' },
  { id: 'tribe-naphtali', displayName: 'NAPHTALI' },
  { id: 'tribe-manasseh', displayName: 'MANASSEH' },
  { id: 'tribe-simeon', displayName: 'SIMEON' },
  { id: 'tribe-levi', displayName: 'LEVI' },
  { id: 'tribe-issachar', displayName: 'ISSACHAR' },
  { id: 'tribe-zebulun', displayName: 'ZEBULUN' },
  { id: 'tribe-joseph', displayName: 'JOSEPH' },
  { id: 'tribe-benjamin', displayName: 'BENJAMIN' },
];
