export const SmsMessagePurpose = {
  VoteParticipationReminder: 'VOTE_PARTICIPATION_REMINDER',
  VoteResultNotice: 'VOTE_RESULT_NOTICE',
  UpcomingVoteNotice: 'UPCOMING_VOTE_NOTICE',
  FieldVotingSessionNotice: 'FIELD_VOTING_SESSION_NOTICE',
} as const;

export type SmsMessagePurpose =
  (typeof SmsMessagePurpose)[keyof typeof SmsMessagePurpose];

export type VoteSmsMessagePurpose =
  | typeof SmsMessagePurpose.VoteParticipationReminder
  | typeof SmsMessagePurpose.VoteResultNotice
  | typeof SmsMessagePurpose.UpcomingVoteNotice;
