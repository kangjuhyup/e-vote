import type { FieldVotingSessionStatus } from '../../../../domain/field-voting/type/field-voting-session-status.type';
import type { VotingChannel } from '../../../../domain/vote/type/voting-channel.type';

export class FieldVotingSessionView {
  private constructor(
    readonly id: string,
    readonly commissionId: string,
    readonly voteId: string,
    readonly channel: VotingChannel,
    readonly title: string,
    readonly locationName: string,
    readonly address: string,
    readonly managerIds: readonly string[],
    readonly startsAt: Date,
    readonly endsAt: Date,
    readonly status: FieldVotingSessionStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static of(params: {
    readonly id: string;
    readonly commissionId: string;
    readonly voteId: string;
    readonly channel: VotingChannel;
    readonly title: string;
    readonly locationName: string;
    readonly address: string;
    readonly managerIds: readonly string[];
    readonly startsAt: Date;
    readonly endsAt: Date;
    readonly status: FieldVotingSessionStatus;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }): FieldVotingSessionView {
    return new FieldVotingSessionView(
      params.id,
      params.commissionId,
      params.voteId,
      params.channel,
      params.title,
      params.locationName,
      params.address,
      params.managerIds,
      params.startsAt,
      params.endsAt,
      params.status,
      params.createdAt,
      params.updatedAt,
    );
  }
}

export class FieldVotingSessionPageView {
  private constructor(
    readonly items: readonly FieldVotingSessionView[],
    readonly page: number,
    readonly pageSize: number,
    readonly totalItems: number,
    readonly totalPages: number,
  ) {}

  static of(params: {
    readonly items: readonly FieldVotingSessionView[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
  }): FieldVotingSessionPageView {
    return new FieldVotingSessionPageView(
      params.items,
      params.page,
      params.pageSize,
      params.totalItems,
      params.totalPages,
    );
  }
}
