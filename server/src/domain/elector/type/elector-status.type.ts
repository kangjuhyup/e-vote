export const ElectorStatus = {
  Eligible: 'ELIGIBLE',
  Blocked: 'BLOCKED',
} as const;

export type ElectorStatus = (typeof ElectorStatus)[keyof typeof ElectorStatus];
