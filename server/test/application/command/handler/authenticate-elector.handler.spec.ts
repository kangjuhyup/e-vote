import type { RecordElectorVerification } from '../../../../src/modules/elector/application/port/persistence/command/elector-verification-repository.port';
import { AuthenticateElectorCommand } from '../../../../src/modules/elector/application/command/dto/request/authenticate-elector.command';
import { AuthenticateElectorHandler } from '../../../../src/modules/elector/application/command/handler/authenticate-elector.handler';
import { ElectorAggregate } from '../../../../src/modules/elector/domain/elector.aggregate';
import { ElectorIdentityVerificationResult } from '../../../../src/modules/elector/domain/vo/elector-identity-verification.vo';
import { ElectorStatus } from '../../../../src/shared/domain/voting/type/elector-status.type';

function fixture() {
  const elector = ElectorAggregate.create({
    id: 'elector-1',
    voteId: 'vote-1',
    identifier: 'member-1',
  });
  const repository = {
    nextId: jest.fn(),
    findById: jest.fn().mockResolvedValue(elector),
    save: jest.fn(),
  };
  const provider = {
    verify: jest.fn().mockResolvedValue(
      ElectorIdentityVerificationResult.of({
        verified: true,
        provider: 'ETC',
        method: 'ADMIN',
        isMock: true,
      }),
    ),
  };
  const records = {
    record: jest
      .fn<Promise<boolean>, [RecordElectorVerification]>()
      .mockResolvedValue(true),
  };
  const handler = new AuthenticateElectorHandler(repository, provider, records);
  const command = AuthenticateElectorCommand.of({
    userPrincipalId: 'user-1',
    voteId: 'vote-1',
    electorId: 'elector-1',
    provider: 'MOCK',
    transactionId: 'mock-success:12345678',
    verifiedAt: new Date(),
  });
  return { elector, repository, provider, records, handler, command };
}
describe('AuthenticateElectorHandler', () => {
  it('verifies outside persistence and passes the trusted principal into the atomic record operation', async () => {
    const f = fixture();
    await expect(f.handler.execute(f.command)).resolves.toMatchObject({
      identityVerified: true,
    });
    expect(f.provider.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrincipalId: 'user-1',
        elector: f.elector,
      }),
    );
    expect(f.records.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrincipalId: 'user-1',
        elector: f.elector,
        transactionId: f.command.transactionId,
      }),
    );
    expect(f.provider.verify.mock.invocationCallOrder[0]).toBeLessThan(
      f.records.record.mock.invocationCallOrder[0],
    );
    expect(f.repository.save).not.toHaveBeenCalled();
  });
  it('persists failure without marking the elector verified', async () => {
    const f = fixture();
    f.provider.verify.mockResolvedValue(
      ElectorIdentityVerificationResult.of({
        verified: false,
        provider: 'ETC',
        method: 'ADMIN',
        isMock: true,
      }),
    );
    f.records.record.mockResolvedValue(false);
    await expect(f.handler.execute(f.command)).resolves.toMatchObject({
      identityVerified: false,
    });
    expect(f.records.record.mock.calls[0][0].result.verified).toBe(false);
    expect(f.elector.isIdentityVerified()).toBe(false);
  });
  it('rejects blocked electors before contacting the provider', async () => {
    const f = fixture();
    f.elector.status = ElectorStatus.Blocked;
    await expect(f.handler.execute(f.command)).rejects.toThrow('not eligible');
    expect(f.provider.verify).not.toHaveBeenCalled();
  });
  it('does not persist a provider outage as successful verification', async () => {
    const f = fixture();
    f.provider.verify.mockRejectedValue(new Error('unavailable'));
    await expect(f.handler.execute(f.command)).rejects.toThrow('unavailable');
    expect(f.records.record).not.toHaveBeenCalled();
  });
  it('does not return success if the final transaction rejects a changed elector', async () => {
    const f = fixture();
    f.records.record.mockRejectedValue(new Error('identity changed'));
    await expect(f.handler.execute(f.command)).rejects.toThrow(
      'identity changed',
    );
  });
});
