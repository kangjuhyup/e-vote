export const PrivacyMode = {
  Secret: 'SECRET',
  Public: 'PUBLIC',
} as const;

export type PrivacyMode = (typeof PrivacyMode)[keyof typeof PrivacyMode];

export const ParticipationUnit = {
  Individual: 'INDIVIDUAL',
  Group: 'GROUP',
} as const;

export type ParticipationUnit =
  (typeof ParticipationUnit)[keyof typeof ParticipationUnit];

export const ResultStorageMode = {
  Database: 'DATABASE',
  Blockchain: 'BLOCKCHAIN',
} as const;

export type ResultStorageMode =
  (typeof ResultStorageMode)[keyof typeof ResultStorageMode];

export const VoteWeightMode = {
  Equal: 'EQUAL',
  Share: 'SHARE',
} as const;

export type VoteWeightMode =
  (typeof VoteWeightMode)[keyof typeof VoteWeightMode];
