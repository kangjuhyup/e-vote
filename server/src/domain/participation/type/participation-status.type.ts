export const ParticipationStatus = {
  Cast: 'CAST',
  Canceled: 'CANCELED',
} as const;

export type ParticipationStatus =
  (typeof ParticipationStatus)[keyof typeof ParticipationStatus];
