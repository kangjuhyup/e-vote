export const ElectionCommissionMemberRole = {
  Admin: 'ADMIN',
  FieldManager: 'FIELD_MANAGER',
} as const;

export type ElectionCommissionMemberRole =
  (typeof ElectionCommissionMemberRole)[keyof typeof ElectionCommissionMemberRole];
