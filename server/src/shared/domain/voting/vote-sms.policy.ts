import type {
  FieldVotingSessionReference,
  VoteReference,
} from './capability-reference';
import { DomainError } from '../domain-error';
import {
  SmsMessagePurpose,
  type VoteSmsMessagePurpose,
} from './type/sms-message-purpose.type';
import { VoteStatus } from './type/vote-status.type';
import { VotingChannel } from './type/voting-channel.type';

export class VoteSmsPolicy {
  static assertVoteMessageAllowed(
    vote: VoteReference,
    purpose: VoteSmsMessagePurpose,
  ): void {
    const requiredStatus = VoteSmsPolicy.requiredVoteStatus(purpose);

    if (vote.status !== requiredStatus) {
      throw new DomainError(
        `${purpose} requires vote status ${requiredStatus}`,
      );
    }
  }

  static assertFieldSessionMessageAllowed(
    vote: VoteReference,
    session: FieldVotingSessionReference,
  ): void {
    if (session.voteId !== vote.id) {
      throw new DomainError('field voting session does not belong to vote');
    }
    if (vote.status !== VoteStatus.Open) {
      throw new DomainError(
        'field voting session notice requires vote status OPEN',
      );
    }
    if (
      session.channel !== VotingChannel.Onsite &&
      session.channel !== VotingChannel.Visit
    ) {
      throw new DomainError(
        'field voting session notice requires onsite or visit channel',
      );
    }
    if (!vote.allowsVotingChannel(session.channel)) {
      throw new DomainError('vote does not allow field voting session channel');
    }
  }

  private static requiredVoteStatus(
    purpose: VoteSmsMessagePurpose,
  ): VoteStatus {
    switch (purpose) {
      case SmsMessagePurpose.VoteParticipationReminder:
        return VoteStatus.Open;
      case SmsMessagePurpose.VoteResultNotice:
        return VoteStatus.Closed;
      case SmsMessagePurpose.UpcomingVoteNotice:
        return VoteStatus.Draft;
    }
  }
}
