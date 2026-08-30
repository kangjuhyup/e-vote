export const ElectionCommissionMemberStatus = {
  Active: 'ACTIVE',
  Inactive: 'INACTIVE',
} as const;

export type ElectionCommissionMemberStatus =
  (typeof ElectionCommissionMemberStatus)[keyof typeof ElectionCommissionMemberStatus];
