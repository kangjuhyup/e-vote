import { CreateElectionCommissionCommand } from '../../../src/application/command/create-election-commission.command';
import { CreateElectionCommissionHandler } from '../../../src/application/command/create-election-commission.handler';
import { RegisterElectionCommissionMemberCommand } from '../../../src/application/command/register-election-commission-member.command';
import { RegisterElectionCommissionMemberHandler } from '../../../src/application/command/register-election-commission-member.handler';
import { ElectionCommissionRepositoryPort } from '../../../src/application/port/election-commission-repository.port';
import { ElectionCommissionMemberRepositoryPort } from '../../../src/application/port/election-commission-member-repository.port';
import { ElectionCommissionAggregate } from '../../../src/domain/election-commission/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../src/domain/election-commission/election-commission-member.aggregate';
import { ElectionCommissionMemberRole } from '../../../src/domain/election-commission/type/election-commission-member-role.type';
import { ElectionCommissionMemberStatus } from '../../../src/domain/election-commission/type/election-commission-member-status.type';
import { ElectionCommissionStatus } from '../../../src/domain/election-commission/type/election-commission-status.type';

describe('election commission command handlers', () => {
  it('creates an active election commission', async () => {
    const save = jest
      .fn<Promise<void>, [ElectionCommissionAggregate]>()
      .mockResolvedValue(undefined);
    const handler = new CreateElectionCommissionHandler({
      nextId: jest.fn().mockReturnValue('commission-1'),
      findById: jest.fn().mockResolvedValue(undefined),
      save,
    });

    const result = await handler.execute(
      CreateElectionCommissionCommand.of({
        name: 'Main Commission',
        createdAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'commission-1',
      status: ElectionCommissionStatus.Active,
    });
    expect(save.mock.calls[0][0]).toBeInstanceOf(ElectionCommissionAggregate);
  });

  it('registers an active commission member for an active commission', async () => {
    const commission = ElectionCommissionAggregate.create({
      id: 'commission-1',
      name: 'Main Commission',
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
    });
    const save = jest
      .fn<Promise<void>, [ElectionCommissionMemberAggregate]>()
      .mockResolvedValue(undefined);
    const commissionRepository: ElectionCommissionRepositoryPort = {
      nextId: jest.fn().mockReturnValue('commission-unused'),
      findById: jest.fn().mockResolvedValue(commission),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const memberRepository: ElectionCommissionMemberRepositoryPort = {
      nextId: jest.fn().mockReturnValue('member-1'),
      findByIds: jest.fn().mockResolvedValue([]),
      save,
    };
    const handler = new RegisterElectionCommissionMemberHandler(
      commissionRepository,
      memberRepository,
    );

    const result = await handler.execute(
      RegisterElectionCommissionMemberCommand.of({
        commissionId: 'commission-1',
        name: 'Kim Manager',
        role: ElectionCommissionMemberRole.FieldManager,
        registeredAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'member-1',
      commissionId: 'commission-1',
      status: ElectionCommissionMemberStatus.Active,
    });
    expect(save.mock.calls[0][0]).toBeInstanceOf(
      ElectionCommissionMemberAggregate,
    );
  });
});
