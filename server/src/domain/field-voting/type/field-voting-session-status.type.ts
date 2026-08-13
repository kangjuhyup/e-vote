export const FieldVotingSessionStatus = {
  Scheduled: 'SCHEDULED',
  Open: 'OPEN',
  Closed: 'CLOSED',
  Canceled: 'CANCELED',
} as const;

export type FieldVotingSessionStatus =
  (typeof FieldVotingSessionStatus)[keyof typeof FieldVotingSessionStatus];
