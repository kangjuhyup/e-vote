import { Inject, Injectable } from '@nestjs/common';
import { FieldVotingSessionAggregate } from '../../../domain/field-voting-session.aggregate';
import {
  ELECTION_COMMISSION_ACCESS_PORT,
  ELECTION_COMMISSION_MEMBER_ACCESS_PORT,
  type ElectionCommissionAccessPort,
  type ElectionCommissionMemberAccessPort,
} from '../../../../../shared/application/port/capability/election-commission-access.port';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from '../../port/persistence/command/field-voting-session-repository.port';
import type { FieldVotingSessionRepositoryPort } from '../../port/persistence/command/field-voting-session-repository.port';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import { CreateFieldVotingSessionCommand } from '../dto/request/create-field-voting-session.command';
import { CreateFieldVotingSessionResult } from '../dto/response/create-field-voting-session-result.dto';

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
    @Inject(ELECTION_COMMISSION_ACCESS_PORT)
    private readonly electionCommissionRepository: ElectionCommissionAccessPort,
    @Inject(VOTE_ACCESS_PORT)
    private readonly voteRepository: VoteAccessPort,
    @Inject(ELECTION_COMMISSION_MEMBER_ACCESS_PORT)
    private readonly electionCommissionMemberRepository: ElectionCommissionMemberAccessPort,
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

    return CreateFieldVotingSessionResult.of({
      id: session.id,
      voteId: session.voteId,
      status: session.status,
    });
  }
}
