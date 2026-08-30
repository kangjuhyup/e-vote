import { Inject, Injectable } from '@nestjs/common';
import { FieldParticipationEvidenceAggregate } from '../../../domain/field-participation-evidence.aggregate';
import {
  ELECTION_COMMISSION_MEMBER_ACCESS_PORT,
  type ElectionCommissionMemberAccessPort,
} from '../../../../../shared/application/port/capability/election-commission-access.port';
import { FIELD_PARTICIPATION_EVIDENCE_REPOSITORY_PORT } from '../../port/persistence/command/field-participation-evidence-repository.port';
import type { FieldParticipationEvidenceRepositoryPort } from '../../port/persistence/command/field-participation-evidence-repository.port';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from '../../port/persistence/command/field-voting-session-repository.port';
import type { FieldVotingSessionRepositoryPort } from '../../port/persistence/command/field-voting-session-repository.port';
import {
  FILE_ACCESS_PORT,
  type FileAccessPort,
} from '../../../../../shared/application/port/capability/file-access.port';
import {
  PARTICIPATION_ACCESS_PORT,
  type ParticipationAccessPort,
} from '../../../../../shared/application/port/capability/participation-access.port';
import { RecordFieldParticipationEvidenceCommand } from '../dto/request/record-field-participation-evidence.command';
import { RecordFieldParticipationEvidenceResult } from '../dto/response/record-field-participation-evidence-result.dto';

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
    @Inject(PARTICIPATION_ACCESS_PORT)
    private readonly participationRepository: ParticipationAccessPort,
    @Inject(FIELD_VOTING_SESSION_REPOSITORY_PORT)
    private readonly fieldVotingSessionRepository: FieldVotingSessionRepositoryPort,
    @Inject(ELECTION_COMMISSION_MEMBER_ACCESS_PORT)
    private readonly electionCommissionMemberRepository: ElectionCommissionMemberAccessPort,
    @Inject(FILE_ACCESS_PORT)
    private readonly fileRepository: FileAccessPort,
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

    return RecordFieldParticipationEvidenceResult.of({
      id: evidence.id,
      participationId: evidence.participationId,
    });
  }
}
