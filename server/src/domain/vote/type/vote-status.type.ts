export const VoteStatus = {
  Draft: 'DRAFT',
  Open: 'OPEN',
  Closed: 'CLOSED',
  Canceled: 'CANCELED',
} as const;

export type VoteStatus = (typeof VoteStatus)[keyof typeof VoteStatus];

export const VoteDetailStatus = {
  Draft: 'DRAFT',
  Open: 'OPEN',
  Closed: 'CLOSED',
  Canceled: 'CANCELED',
} as const;

export type VoteDetailStatus =
  (typeof VoteDetailStatus)[keyof typeof VoteDetailStatus];
