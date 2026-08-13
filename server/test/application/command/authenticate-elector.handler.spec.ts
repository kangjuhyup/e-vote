import { AuthenticateElectorCommand } from '../../../src/application/command/authenticate-elector.command';
import { AuthenticateElectorHandler } from '../../../src/application/command/authenticate-elector.handler';
import { ElectorIdentityVerificationPort } from '../../../src/application/port/elector-identity-verification.port';
import { ElectorRepositoryPort } from '../../../src/application/port/elector-repository.port';
import { ElectorAggregate } from '../../../src/domain/elector/elector.aggregate';
import {
  ElectorIdentityVerificationEvidence,
  ElectorIdentityVerificationResult,
} from '../../../src/domain/elector/elector-identity-verification.vo';
import { ElectorStatus } from '../../../src/domain/elector/type/elector-status.type';

describe('AuthenticateElectorHandler', () => {
  it('verifies elector identity through the port and saves the verified aggregate', async () => {
    const elector = ElectorAggregate.create({
      id: 'elector-1',
      voteId: 'vote-1',
      identifier: 'member-1',
      status: ElectorStatus.Eligible,
    });
    const findById = jest
      .fn<Promise<ElectorAggregate | undefined>, [string, string]>()
      .mockResolvedValue(elector);
    const save = jest
      .fn<Promise<void>, [ElectorAggregate]>()
      .mockResolvedValue(undefined);
    const verify = jest
      .fn<
        Promise<ElectorIdentityVerificationResult>,
        [
          {
            readonly voteId: string;
            readonly elector: ElectorAggregate;
            readonly evidence: ElectorIdentityVerificationEvidence;
          },
        ]
      >()
      .mockResolvedValue(
        ElectorIdentityVerificationResult.of({ verified: true }),
      );
    const repository: ElectorRepositoryPort = {
      nextId: jest.fn().mockReturnValue('unused'),
      findById,
      save,
    };
    const identityVerificationPort: ElectorIdentityVerificationPort = {
      verify,
    };
    const handler = new AuthenticateElectorHandler(
      repository,
      identityVerificationPort,
    );

    const result = await handler.execute(
      AuthenticateElectorCommand.of({
        voteId: 'vote-1',
        electorId: 'elector-1',
        provider: 'PASS',
        transactionId: 'tx-1',
        verifiedAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'elector-1',
      voteId: 'vote-1',
      identityVerified: true,
    });
    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      elector,
    });
    expect(verify.mock.calls[0][0].evidence).toMatchObject({
      provider: 'PASS',
      transactionId: 'tx-1',
      verifiedAt: new Date('2026-08-13T00:00:00.000Z'),
    });
    expect(save).toHaveBeenCalledWith(elector);
    expect(elector.isIdentityVerified()).toBe(true);
  });

  it('does not mark elector verified when identity verification fails', async () => {
    const elector = ElectorAggregate.create({
      id: 'elector-1',
      voteId: 'vote-1',
      identifier: 'member-1',
      status: ElectorStatus.Eligible,
    });
    const save = jest
      .fn<Promise<void>, [ElectorAggregate]>()
      .mockResolvedValue(undefined);
    const repository: ElectorRepositoryPort = {
      nextId: jest.fn().mockReturnValue('unused'),
      findById: jest.fn().mockResolvedValue(elector),
      save,
    };
    const identityVerificationPort: ElectorIdentityVerificationPort = {
      verify: jest
        .fn()
        .mockResolvedValue(
          ElectorIdentityVerificationResult.of({ verified: false }),
        ),
    };
    const handler = new AuthenticateElectorHandler(
      repository,
      identityVerificationPort,
    );

    const result = await handler.execute(
      AuthenticateElectorCommand.of({
        voteId: 'vote-1',
        electorId: 'elector-1',
        provider: 'PASS',
        transactionId: 'tx-1',
        verifiedAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'elector-1',
      voteId: 'vote-1',
      identityVerified: false,
    });
    expect(elector.isIdentityVerified()).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
});
