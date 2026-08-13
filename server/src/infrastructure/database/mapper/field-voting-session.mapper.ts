import { FieldVotingSessionAggregate } from '../../../domain/field-voting/field-voting-session.aggregate';
import { FieldVotingSessionStatus } from '../../../domain/field-voting/type/field-voting-session-status.type';
import { VotingChannel } from '../../../domain/vote/type/voting-channel.type';
import { EntityRelationReference } from './mapper-relation.type';

export type FieldVotingSessionPersistence = {
  readonly id: string;
  readonly commission: EntityRelationReference;
  readonly vote: EntityRelationReference;
  readonly channel: VotingChannel;
  readonly title: string;
  readonly locationName: string;
  readonly address: string;
  readonly managerLinks: readonly {
    readonly commissionMember: EntityRelationReference;
  }[];
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: FieldVotingSessionStatus;
};

export class FieldVotingSessionMapper {
  static toDomain(
    entity: FieldVotingSessionPersistence,
  ): FieldVotingSessionAggregate {
    return FieldVotingSessionAggregate.reconstitute({
      id: entity.id,
      commissionId: entity.commission.id,
      voteId: entity.vote.id,
      channel: entity.channel,
      title: entity.title,
      locationName: entity.locationName,
      address: entity.address,
      managerIds: entity.managerLinks.map(
        (managerLink) => managerLink.commissionMember.id,
      ),
      startsAt: entity.startsAt,
      endsAt: entity.endsAt,
      status: entity.status,
    });
  }
}
