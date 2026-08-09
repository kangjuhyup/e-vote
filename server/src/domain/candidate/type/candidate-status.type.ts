export const CandidateStatus = {
  Active: 'ACTIVE',
  Withdrawn: 'WITHDRAWN',
} as const;

export type CandidateStatus =
  (typeof CandidateStatus)[keyof typeof CandidateStatus];
