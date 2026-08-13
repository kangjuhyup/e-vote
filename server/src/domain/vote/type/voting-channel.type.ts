export const VotingChannel = {
  Online: 'ONLINE',
  Onsite: 'ONSITE',
  Visit: 'VISIT',
} as const;

export type VotingChannel =
  (typeof VotingChannel)[keyof typeof VotingChannel];
