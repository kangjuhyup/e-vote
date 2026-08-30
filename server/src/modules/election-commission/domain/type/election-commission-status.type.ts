export const ElectionCommissionStatus = {
  Active: 'ACTIVE',
  Suspended: 'SUSPENDED',
} as const;

export type ElectionCommissionStatus =
  (typeof ElectionCommissionStatus)[keyof typeof ElectionCommissionStatus];
