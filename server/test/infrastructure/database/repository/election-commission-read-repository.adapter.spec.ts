import { LoadStrategy } from '@mikro-orm/core';
import { ElectionCommissionMemberRole } from '../../../../src/modules/election-commission/domain/type/election-commission-member-role.type';
import { ElectionCommissionMemberStatus } from '../../../../src/modules/election-commission/domain/type/election-commission-member-status.type';
import { ElectionCommissionStatus } from '../../../../src/modules/election-commission/domain/type/election-commission-status.type';
import { ElectionCommissionReadRepositoryAdapter } from '../../../../src/modules/election-commission/infrastructure/database/repository/query/election-commission-read-repository.adapter';

type MockEntityManager = {
  readonly findAndCount: jest.Mock<
    Promise<[unknown[], number]>,
    [unknown, unknown, unknown?]
  >;
  readonly findOne: jest.Mock<Promise<unknown>, [unknown, unknown, unknown?]>;
};

describe('ElectionCommissionReadRepositoryAdapter', () => {
  it('maps an election commission detail with stably ordered members', async () => {
    const em = createMockEntityManager();
    em.findOne.mockResolvedValue(createElectionCommissionEntity());
    const adapter = new ElectionCommissionReadRepositoryAdapter(em as any);

    const result = await adapter.findDetailById('commission-1');

    expect(em.findOne.mock.calls[0][1]).toEqual({ id: 'commission-1' });
    expect(em.findOne.mock.calls[0][2]).toMatchObject({
      populate: ['members'],
      strategy: LoadStrategy.JOINED,
    });
    expect(result).toMatchObject({
      id: 'commission-1',
      name: 'Main Commission',
      status: ElectionCommissionStatus.Active,
      members: [
        {
          id: 'member-1',
          commissionId: 'commission-1',
          name: 'Kim Admin',
          role: ElectionCommissionMemberRole.Admin,
          status: ElectionCommissionMemberStatus.Active,
        },
        {
          id: 'member-2',
          commissionId: 'commission-1',
          name: 'Lee Manager',
          role: ElectionCommissionMemberRole.FieldManager,
          status: ElectionCommissionMemberStatus.Active,
        },
      ],
    });
  });

  it('returns undefined when the election commission is missing', async () => {
    const adapter = new ElectionCommissionReadRepositoryAdapter(
      createMockEntityManager() as any,
    );

    await expect(adapter.findDetailById('missing')).resolves.toBeUndefined();
  });

  it('maps a paginated election commission summary with stable ordering', async () => {
    const em = createMockEntityManager();
    em.findAndCount.mockResolvedValue([[createElectionCommissionEntity()], 21]);
    const adapter = new ElectionCommissionReadRepositoryAdapter(em as any);

    const result = await adapter.findPage({ page: 2, pageSize: 20 });

    expect(em.findAndCount.mock.calls[0][1]).toEqual({});
    expect(em.findAndCount.mock.calls[0][2]).toMatchObject({
      limit: 20,
      offset: 20,
      orderBy: {
        createdAt: 'desc',
        id: 'desc',
      },
    });
    expect(result).toMatchObject({
      items: [
        {
          id: 'commission-1',
          name: 'Main Commission',
          status: ElectionCommissionStatus.Active,
        },
      ],
      page: 2,
      pageSize: 20,
      totalItems: 21,
      totalPages: 2,
    });
  });
});

function createMockEntityManager(): MockEntityManager {
  return {
    findAndCount: jest
      .fn<Promise<[unknown[], number]>, [unknown, unknown, unknown?]>()
      .mockResolvedValue([[], 0]),
    findOne: jest
      .fn<Promise<unknown>, [unknown, unknown, unknown?]>()
      .mockResolvedValue(null),
  };
}

function createElectionCommissionEntity(): Record<string, unknown> {
  const createdAt = new Date('2026-08-30T00:00:00.000Z');

  return {
    id: 'commission-1',
    name: 'Main Commission',
    status: ElectionCommissionStatus.Active,
    createdAt,
    updatedAt: new Date('2026-08-30T01:00:00.000Z'),
    members: [
      {
        id: 'member-2',
        name: 'Lee Manager',
        role: ElectionCommissionMemberRole.FieldManager,
        status: ElectionCommissionMemberStatus.Active,
        registeredAt: new Date('2026-08-30T00:02:00.000Z'),
        updatedAt: new Date('2026-08-30T01:02:00.000Z'),
      },
      {
        id: 'member-1',
        name: 'Kim Admin',
        role: ElectionCommissionMemberRole.Admin,
        status: ElectionCommissionMemberStatus.Active,
        registeredAt: new Date('2026-08-30T00:01:00.000Z'),
        updatedAt: new Date('2026-08-30T01:01:00.000Z'),
      },
    ],
  };
}
