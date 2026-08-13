import { Inject, Injectable } from '@nestjs/common';
import { ElectorIdentityVerificationEvidence } from '../../domain/elector/elector-identity-verification.vo';
import { AuthenticateElectorCommand } from './authenticate-elector.command';
import { ELECTOR_IDENTITY_VERIFICATION_PORT } from '../port/elector-identity-verification.port';
import type { ElectorIdentityVerificationPort } from '../port/elector-identity-verification.port';
import { ELECTOR_REPOSITORY_PORT } from '../port/elector-repository.port';
import type { ElectorRepositoryPort } from '../port/elector-repository.port';

export type AuthenticateElectorResult = {
  id: string;
  voteId: string;
  identityVerified: boolean;
};

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

    return {
      id: elector.id,
      voteId: elector.voteId,
      identityVerified: elector.isIdentityVerified(),
    };
  }
}
