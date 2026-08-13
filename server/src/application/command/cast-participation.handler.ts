import { Inject, Injectable } from '@nestjs/common';
import { ParticipationAggregate } from '../../domain/participation/participation.aggregate';
import { ParticipationEligibilityPolicy } from '../../domain/participation/participation-eligibility.policy';
import { ParticipationStatus } from '../../domain/participation/type/participation-status.type';
import { ELECTOR_REPOSITORY_PORT } from '../port/elector-repository.port';
import type { ElectorRepositoryPort } from '../port/elector-repository.port';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from '../port/field-voting-session-repository.port';
import type { FieldVotingSessionRepositoryPort } from '../port/field-voting-session-repository.port';
import { PARTICIPATION_REPOSITORY_PORT } from '../port/participation-repository.port';
import type { ParticipationRepositoryPort } from '../port/participation-repository.port';
import { VOTE_DETAIL_REPOSITORY_PORT } from '../port/vote-detail-repository.port';
import type { VoteDetailRepositoryPort } from '../port/vote-detail-repository.port';
import { VOTE_REPOSITORY_PORT } from '../port/vote-repository.port';
import type { VoteRepositoryPort } from '../port/vote-repository.port';
import { CastParticipationCommand } from './cast-participation.command';

export type CastParticipationResult = {
  id: string;
  voteDetailId: string;
  status: ParticipationStatus;
};

export class VoteNotFoundError extends Error {
  constructor() {
    super('vote not found');
  }
}

export class VoteDetailNotFoundError extends Error {
  constructor() {
    super('vote detail not found');
  }
}

export class ElectorNotFoundError extends Error {
  constructor() {
    super('elector not found');
  }
}

export class FieldVotingSessionNotFoundError extends Error {
  constructor() {
    super('field voting session not found');
  }
}

@Injectable()
export class CastParticipationHandler {
  private readonly eligibilityPolicy = new ParticipationEligibilityPolicy();

  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly voteRepository: VoteRepositoryPort,
    @Inject(VOTE_DETAIL_REPOSITORY_PORT)
    private readonly voteDetailRepository: VoteDetailRepositoryPort,
    @Inject(ELECTOR_REPOSITORY_PORT)
    private readonly electorRepository: ElectorRepositoryPort,
    @Inject(PARTICIPATION_REPOSITORY_PORT)
    private readonly participationRepository: ParticipationRepositoryPort,
    @Inject(FIELD_VOTING_SESSION_REPOSITORY_PORT)
    private readonly fieldVotingSessionRepository: FieldVotingSessionRepositoryPort,
  ) {}

  async execute(
    command: CastParticipationCommand,
  ): Promise<CastParticipationResult> {
    const [vote, voteDetail, elector, existingParticipations] =
      await Promise.all([
        this.voteRepository.findById(command.voteId),
        this.voteDetailRepository.findById(command.voteDetailId),
        this.electorRepository.findById(command.voteId, command.electorId),
        this.participationRepository.findCastByVoteDetailId(
          command.voteDetailId,
        ),
      ]);

    if (!vote) {
      throw new VoteNotFoundError();
    }

    if (!voteDetail || voteDetail.voteId !== vote.id) {
      throw new VoteDetailNotFoundError();
    }

    if (!elector) {
      throw new ElectorNotFoundError();
    }

    const fieldVotingSession = await this.findFieldVotingSession(command);

    if (fieldVotingSession && fieldVotingSession.voteId !== vote.id) {
      throw new FieldVotingSessionNotFoundError();
    }

    const effectivePolicy = voteDetail.getEffectivePolicy(vote.defaultPolicy);
    this.eligibilityPolicy.assertCanParticipate({
      voteDetailId: voteDetail.id,
      elector,
      effectivePolicy,
      existingParticipations,
      identityVerificationRequired: vote.identityVerificationPolicy.required,
    });

    const participation = ParticipationAggregate.cast({
      id: this.participationRepository.nextId(),
      voteDetailId: voteDetail.id,
      elector,
      selectedCandidateId: command.selectedCandidateId,
      effectivePolicy,
      votingChannel: command.votingChannel,
      fieldVotingSession,
      participatedAt: command.participatedAt,
    });

    await this.participationRepository.save(participation);

    return {
      id: participation.id,
      voteDetailId: participation.voteDetailId,
      status: participation.status,
    };
  }

  private async findFieldVotingSession(command: CastParticipationCommand) {
    if (!command.fieldVotingSessionId) {
      return undefined;
    }

    const fieldVotingSession = await this.fieldVotingSessionRepository.findById(
      command.fieldVotingSessionId,
    );

    if (!fieldVotingSession) {
      throw new FieldVotingSessionNotFoundError();
    }

    return fieldVotingSession;
  }
}
