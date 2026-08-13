import type { VotingChannel } from '../../domain/vote/type/voting-channel.type';

export class CreateFieldVotingSessionCommand {
  private constructor(
    readonly commissionId: string,
    readonly voteId: string,
    readonly channel: VotingChannel,
    readonly title: string,
    readonly locationName: string,
    readonly address: string,
    readonly managerIds: readonly string[],
    readonly startsAt: Date,
    readonly endsAt: Date,
    readonly scheduledAt: Date,
  ) {}

  static of(params: {
    commissionId: string;
    voteId: string;
    channel: VotingChannel;
    title: string;
    locationName: string;
    address: string;
    managerIds: readonly string[];
    startsAt: Date;
    endsAt: Date;
    scheduledAt: Date;
  }): CreateFieldVotingSessionCommand {
    return new CreateFieldVotingSessionCommand(
      params.commissionId,
      params.voteId,
      params.channel,
      params.title,
      params.locationName,
      params.address,
      params.managerIds,
      params.startsAt,
      params.endsAt,
      params.scheduledAt,
    );
  }
}
