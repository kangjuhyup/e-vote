import {
  ELECTOR_PARTICIPANT_ACCESS_PORT,
  ElectorParticipantForbiddenError,
  type ElectorParticipantAccessPort,
} from '../../../../../shared/application/port/capability/elector-participant-access.port';
import { Inject, Injectable } from '@nestjs/common';
import { ParticipationAggregate } from '../../../domain/participation.aggregate';
import { ParticipationEligibilityPolicy } from '../../../domain/participation-eligibility.policy';
import {
  CANDIDATE_ACCESS_PORT,
  VOTE_ACCESS_PORT,
  VOTE_DETAIL_ACCESS_PORT,
  type CandidateAccessPort,
  type VoteAccessPort,
  type VoteDetailAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import {
  ELECTOR_ACCESS_PORT,
  type ElectorAccessPort,
} from '../../../../../shared/application/port/capability/elector-access.port';
import {
  FIELD_VOTING_SESSION_ACCESS_PORT,
  type FieldVotingSessionAccessPort,
} from '../../../../../shared/application/port/capability/field-voting-access.port';
import { PARTICIPATION_REPOSITORY_PORT } from '../../port/persistence/command/participation-repository.port';
import type { ParticipationRepositoryPort } from '../../port/persistence/command/participation-repository.port';
import { CastParticipationCommand } from '../dto/request/cast-participation.command';
import { CastParticipationResult } from '../dto/response/cast-participation-result.dto';
import {
  ELECTOR_SIGNATURE_ACCESS_PORT,
  type ElectorSignatureAccessPort,
} from '../../../../../shared/application/port/capability/elector-signature-access.port';

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

export class CandidateNotFoundError extends Error {
  constructor() {
    super('candidate not found');
  }
}

export class ParticipationSignatureRequiredError extends Error {
  constructor() {
    super('confirmed elector signature is required for participation');
  }
}

@Injectable()
export class CastParticipationHandler {
  private readonly eligibilityPolicy = new ParticipationEligibilityPolicy();

  constructor(
    @Inject(VOTE_ACCESS_PORT)
    private readonly voteRepository: VoteAccessPort,
    @Inject(VOTE_DETAIL_ACCESS_PORT)
    private readonly voteDetailRepository: VoteDetailAccessPort,
    @Inject(ELECTOR_ACCESS_PORT)
    private readonly electorRepository: ElectorAccessPort,
    @Inject(CANDIDATE_ACCESS_PORT)
    private readonly candidateRepository: CandidateAccessPort,
    @Inject(PARTICIPATION_REPOSITORY_PORT)
    private readonly participationRepository: ParticipationRepositoryPort,
    @Inject(FIELD_VOTING_SESSION_ACCESS_PORT)
    private readonly fieldVotingSessionRepository: FieldVotingSessionAccessPort,
    @Inject(ELECTOR_PARTICIPANT_ACCESS_PORT)
    private readonly participantAccess: ElectorParticipantAccessPort,
    @Inject(ELECTOR_SIGNATURE_ACCESS_PORT)
    private readonly signatureAccess: ElectorSignatureAccessPort,
  ) {}

  async execute(
    command: CastParticipationCommand,
  ): Promise<CastParticipationResult> {
    return this.participationRepository.runCastTransaction(
      {
        voteId: command.voteId,
        voteDetailId: command.voteDetailId,
        electorId: command.electorId,
        candidateId: command.selectedCandidateId,
        fieldVotingSessionId: command.fieldVotingSessionId,
      },
      () => this.castWithinTransaction(command),
    );
  }

  private async castWithinTransaction(
    command: CastParticipationCommand,
  ): Promise<CastParticipationResult> {
    if (
      !command.userPrincipalId?.trim() ||
      !(await this.participantAccess.isAuthorized(
        command.voteId,
        command.electorId,
        command.userPrincipalId,
      ))
    )
      throw new ElectorParticipantForbiddenError();

    const [vote, voteDetail, elector, candidate, existingParticipations] =
      await Promise.all([
        this.voteRepository.findById(command.voteId),
        this.voteDetailRepository.findById(command.voteDetailId),
        this.electorRepository.findById(command.voteId, command.electorId),
        command.selectedCandidateId
          ? this.candidateRepository.findById(command.selectedCandidateId)
          : Promise.resolve(undefined),
        this.participationRepository.findCastByVoteDetailId(
          command.voteDetailId,
        ),
      ]);

    if (!vote) {
      throw new VoteNotFoundError();
    }

    vote.assertParticipationAllowed(command.votingChannel);

    if (!voteDetail || !voteDetail.belongsToVote(vote.id)) {
      throw new VoteDetailNotFoundError();
    }

    voteDetail.assertParticipationAllowed();

    if (!elector) {
      throw new ElectorNotFoundError();
    }

    if (
      !(await this.signatureAccess.hasConfirmedSignature(
        command.voteId,
        command.electorId,
      ))
    ) {
      throw new ParticipationSignatureRequiredError();
    }

    if (!candidate || !candidate.isSelectableForVoteDetail(voteDetail.id)) {
      throw new CandidateNotFoundError();
    }

    const fieldVotingSession = await this.findFieldVotingSession(command);

    if (fieldVotingSession && !fieldVotingSession.belongsToVote(vote.id)) {
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

    await this.participationRepository.saveCastWithResult(
      participation,
      candidate.id,
    );

    return CastParticipationResult.of({
      id: participation.id,
      voteDetailId: participation.voteDetailId,
      status: participation.status,
    });
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
