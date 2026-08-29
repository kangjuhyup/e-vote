import { Inject, Injectable } from '@nestjs/common';
import { FieldVotingSessionAggregate } from '../../../domain/field-voting/field-voting-session.aggregate';
import { FieldVotingSessionStatus } from '../../../domain/field-voting/type/field-voting-session-status.type';
import { ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT } from '../../port/persistence/command/election-commission-member-repository.port';
import type { ElectionCommissionMemberRepositoryPort } from '../../port/persistence/command/election-commission-member-repository.port';
import { ELECTION_COMMISSION_REPOSITORY_PORT } from '../../port/persistence/command/election-commission-repository.port';
import type { ElectionCommissionRepositoryPort } from '../../port/persistence/command/election-commission-repository.port';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from '../../port/persistence/command/field-voting-session-repository.port';
import type { FieldVotingSessionRepositoryPort } from '../../port/persistence/command/field-voting-session-repository.port';
import { VOTE_REPOSITORY_PORT } from '../../port/persistence/command/vote-repository.port';
import type { VoteRepositoryPort } from '../../port/persistence/command/vote-repository.port';
import { CreateFieldVotingSessionCommand } from '../create-field-voting-session.command';

export type CreateFieldVotingSessionResult = {
  id: string;
  voteId: string;
  status: FieldVotingSessionStatus;
};

export class ElectionCommissionNotFoundError extends Error {
  constructor() {
    super('election commission not found');
  }
}

export class VoteNotFoundError extends Error {
  constructor() {
    super('vote not found');
  }
}

export class ElectionCommissionMemberNotFoundError extends Error {
  constructor() {
    super('election commission member not found');
  }
}

@Injectable()
export class CreateFieldVotingSessionHandler {
  constructor(
    @Inject(ELECTION_COMMISSION_REPOSITORY_PORT)
    private readonly electionCommissionRepository: ElectionCommissionRepositoryPort,
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly voteRepository: VoteRepositoryPort,
    @Inject(ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT)
    private readonly electionCommissionMemberRepository: ElectionCommissionMemberRepositoryPort,
    @Inject(FIELD_VOTING_SESSION_REPOSITORY_PORT)
    private readonly fieldVotingSessionRepository: FieldVotingSessionRepositoryPort,
  ) {}

  async execute(
    command: CreateFieldVotingSessionCommand,
  ): Promise<CreateFieldVotingSessionResult> {
    const [commission, vote, managers] = await Promise.all([
      this.electionCommissionRepository.findById(command.commissionId),
      this.voteRepository.findById(command.voteId),
      this.electionCommissionMemberRepository.findByIds(
        command.commissionId,
        command.managerIds,
      ),
    ]);

    if (!commission) {
      throw new ElectionCommissionNotFoundError();
    }

    if (!vote) {
      throw new VoteNotFoundError();
    }

    if (managers.length !== command.managerIds.length) {
      throw new ElectionCommissionMemberNotFoundError();
    }

    const session = FieldVotingSessionAggregate.schedule({
      id: this.fieldVotingSessionRepository.nextId(),
      commission,
      vote,
      channel: command.channel,
      title: command.title,
      locationName: command.locationName,
      address: command.address,
      managers,
      startsAt: command.startsAt,
      endsAt: command.endsAt,
      scheduledAt: command.scheduledAt,
    });

    await this.fieldVotingSessionRepository.save(session);

    return {
      id: session.id,
      voteId: session.voteId,
      status: session.status,
    };
  }
}
