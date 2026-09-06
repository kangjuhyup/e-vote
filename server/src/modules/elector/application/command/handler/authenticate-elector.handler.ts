import {
  ELECTOR_VERIFICATION_REPOSITORY_PORT,
  type ElectorVerificationRepositoryPort,
} from '../../port/persistence/command/elector-verification-repository.port';
import { ElectorParticipantForbiddenError } from '../../../../../shared/application/port/capability/elector-participant-access.port';
import { ElectorStatus } from '../../../../../shared/domain/voting/type/elector-status.type';
import { DomainError } from '../../../../../shared/domain/domain-error';
import { Inject, Injectable } from '@nestjs/common';
import { ElectorIdentityVerificationEvidence } from '../../../domain/vo/elector-identity-verification.vo';
import { AuthenticateElectorCommand } from '../dto/request/authenticate-elector.command';
import { AuthenticateElectorResult } from '../dto/response/authenticate-elector-result.dto';
import { ELECTOR_IDENTITY_VERIFICATION_PORT } from '../../port/gateway/elector-identity-verification.port';
import type { ElectorIdentityVerificationPort } from '../../port/gateway/elector-identity-verification.port';
import { ELECTOR_REPOSITORY_PORT } from '../../port/persistence/command/elector-repository.port';
import type { ElectorRepositoryPort } from '../../port/persistence/command/elector-repository.port';

export class ElectorNotFoundError extends Error {
  constructor() {
    super('elector not found');
  }
}

@Injectable()
export class AuthenticateElectorHandler {
  constructor(
    @Inject(ELECTOR_REPOSITORY_PORT)
    private readonly electorRepository: ElectorRepositoryPort,
    @Inject(ELECTOR_IDENTITY_VERIFICATION_PORT)
    private readonly identityVerificationPort: ElectorIdentityVerificationPort,
    @Inject(ELECTOR_VERIFICATION_REPOSITORY_PORT)
    private readonly verificationRepository: ElectorVerificationRepositoryPort,
  ) {}

  async execute(
    command: AuthenticateElectorCommand,
  ): Promise<AuthenticateElectorResult> {
    if (!command.userPrincipalId?.trim())
      throw new ElectorParticipantForbiddenError();
    const elector = await this.electorRepository.findById(
      command.voteId,
      command.electorId,
    );

    if (!elector) {
      throw new ElectorNotFoundError();
    }

    if (elector.status !== ElectorStatus.Eligible)
      throw new DomainError('elector is not eligible');

    const evidence = ElectorIdentityVerificationEvidence.of({
      provider: command.provider,
      transactionId: command.transactionId,
      verifiedAt: command.verifiedAt,
    });
    const verificationResult = await this.identityVerificationPort.verify({
      voteId: command.voteId,
      elector,
      userPrincipalId: command.userPrincipalId,
      evidence,
    });

    const identityVerified = await this.verificationRepository.record({
      elector,
      userPrincipalId: command.userPrincipalId,
      transactionId: evidence.transactionId,
      result: verificationResult,
    });

    return AuthenticateElectorResult.of({
      id: elector.id,
      voteId: elector.voteId,
      identityVerified,
    });
  }
}
