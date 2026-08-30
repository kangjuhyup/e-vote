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
  ) {}

  async execute(
    command: AuthenticateElectorCommand,
  ): Promise<AuthenticateElectorResult> {
    const elector = await this.electorRepository.findById(
      command.voteId,
      command.electorId,
    );

    if (!elector) {
      throw new ElectorNotFoundError();
    }

    const evidence = ElectorIdentityVerificationEvidence.of({
      provider: command.provider,
      transactionId: command.transactionId,
      verifiedAt: command.verifiedAt,
    });
    const verificationResult = await this.identityVerificationPort.verify({
      voteId: command.voteId,
      elector,
      evidence,
    });

    if (verificationResult.verified) {
      elector.markIdentityVerified();
      await this.electorRepository.save(elector);
    }

    return AuthenticateElectorResult.of({
      id: elector.id,
      voteId: elector.voteId,
      identityVerified: elector.isIdentityVerified(),
    });
  }
}
