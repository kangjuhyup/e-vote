import { Inject, Injectable } from '@nestjs/common';
import { FieldParticipationEvidenceAggregate } from '../../../domain/field-voting/field-participation-evidence.aggregate';
import { ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT } from '../../port/persistence/command/election-commission-member-repository.port';
import type { ElectionCommissionMemberRepositoryPort } from '../../port/persistence/command/election-commission-member-repository.port';
import { FIELD_PARTICIPATION_EVIDENCE_REPOSITORY_PORT } from '../../port/persistence/command/field-participation-evidence-repository.port';
import type { FieldParticipationEvidenceRepositoryPort } from '../../port/persistence/command/field-participation-evidence-repository.port';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from '../../port/persistence/command/field-voting-session-repository.port';
import type { FieldVotingSessionRepositoryPort } from '../../port/persistence/command/field-voting-session-repository.port';
import { FILE_REPOSITORY_PORT } from '../../port/persistence/command/file-repository.port';
import type { FileRepositoryPort } from '../../port/persistence/command/file-repository.port';
import { PARTICIPATION_REPOSITORY_PORT } from '../../port/persistence/command/participation-repository.port';
import type { ParticipationRepositoryPort } from '../../port/persistence/command/participation-repository.port';
import { RecordFieldParticipationEvidenceCommand } from '../record-field-participation-evidence.command';

export type RecordFieldParticipationEvidenceResult = {
  id: string;
  participationId: string;
};

export class ParticipationNotFoundError extends Error {
  constructor() {
    super('participation not found');
  }
}

export class FieldVotingSessionNotFoundError extends Error {
  constructor() {
    super('field voting session not found');
  }
}

export class ElectionCommissionMemberNotFoundError extends Error {
  constructor() {
    super('election commission member not found');
  }
}

export class EvidenceFileNotFoundError extends Error {
  constructor() {
    super('evidence file not found');
  }
}

@Injectable()
export class RecordFieldParticipationEvidenceHandler {
  constructor(
    @Inject(PARTICIPATION_REPOSITORY_PORT)
    private readonly participationRepository: ParticipationRepositoryPort,
    @Inject(FIELD_VOTING_SESSION_REPOSITORY_PORT)
    private readonly fieldVotingSessionRepository: FieldVotingSessionRepositoryPort,
    @Inject(ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT)
    private readonly electionCommissionMemberRepository: ElectionCommissionMemberRepositoryPort,
    @Inject(FILE_REPOSITORY_PORT)
    private readonly fileRepository: FileRepositoryPort,
    @Inject(FIELD_PARTICIPATION_EVIDENCE_REPOSITORY_PORT)
    private readonly fieldParticipationEvidenceRepository: FieldParticipationEvidenceRepositoryPort,
  ) {}

  async execute(
    command: RecordFieldParticipationEvidenceCommand,
  ): Promise<RecordFieldParticipationEvidenceResult> {
    const [participation, fieldVotingSession] = await Promise.all([
      this.participationRepository.findById(command.participationId),
      this.fieldVotingSessionRepository.findById(command.fieldVotingSessionId),
    ]);

    if (!participation) {
      throw new ParticipationNotFoundError();
    }

    if (!fieldVotingSession) {
      throw new FieldVotingSessionNotFoundError();
    }

    const [verifiedBy] =
      await this.electionCommissionMemberRepository.findByIds(
        fieldVotingSession.commissionId,
        [command.verifiedByCommissionMemberId],
      );

    if (!verifiedBy) {
      throw new ElectionCommissionMemberNotFoundError();
    }

    if (
      command.evidenceFileId &&
      !(await this.fileRepository.existsById(command.evidenceFileId))
    ) {
      throw new EvidenceFileNotFoundError();
    }

    const evidence = FieldParticipationEvidenceAggregate.record({
      id: this.fieldParticipationEvidenceRepository.nextId(),
      participation,
      fieldVotingSession,
      verifiedBy,
      evidenceFileId: command.evidenceFileId,
      verificationNote: command.verificationNote,
      verifiedAt: command.verifiedAt,
    });

    await this.fieldParticipationEvidenceRepository.save(evidence);

    return {
      id: evidence.id,
      participationId: evidence.participationId,
    };
  }
}
