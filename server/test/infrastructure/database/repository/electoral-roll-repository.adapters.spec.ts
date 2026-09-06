import { LoadStrategy } from '@mikro-orm/core';
import { ElectoralRollSnapshotRepositoryAdapter } from '../../../../src/modules/electoral-roll/infrastructure/database/repository/command/electoral-roll-snapshot-repository.adapter';
import { ElectoralRollRepositoryAdapter } from '../../../../src/modules/electoral-roll/infrastructure/database/repository/command/electoral-roll-repository.adapter';
import { ElectoralRollReadRepositoryAdapter } from '../../../../src/modules/electoral-roll/infrastructure/database/repository/query/electoral-roll-read-repository.adapter';
import { ElectoralRollMemberAggregate } from '../../../../src/modules/electoral-roll/domain/electoral-roll-member.aggregate';
import { ElectoralRollAggregate } from '../../../../src/modules/electoral-roll/domain/electoral-roll.aggregate';
import { JOINED_RELATION_LOAD_OPTIONS } from '../../../../src/platform/database/repository/database-repository.util';

describe('electoral roll repository adapters', () => {
  it('does not expose shared relation options to MikroORM mutation', async () => {
    const findOne = jest
      .fn<Promise<null>, [unknown, unknown, Record<string, unknown>]>()
      .mockImplementation((_entity, _where, options) => {
        expect(options).not.toBe(JOINED_RELATION_LOAD_OPTIONS);
        options.populate = [];
        return Promise.resolve(null);
      });

    await new ElectoralRollRepositoryAdapter({ findOne } as any).findById(
      'roll-1',
      'user-1',
    );

    expect(Object.isFrozen(JOINED_RELATION_LOAD_OPTIONS)).toBe(true);
    expect(JOINED_RELATION_LOAD_OPTIONS).toEqual({
      strategy: LoadStrategy.JOINED,
    });
  });

  it('creates a roll and its creator access grant in one unit of work', async () => {
    const persist = jest.fn();
    const em = {
      create: jest.fn((_entity: unknown, data: object) => data),
      persist,
      flush: jest.fn(),
    };
    const roll = ElectoralRollAggregate.create({
      id: 'roll-1',
      name: 'Members',
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
    });

    await new ElectoralRollRepositoryAdapter(em as any).create(roll, 'user-1');

    expect(persist).toHaveBeenCalledTimes(2);
    expect(em.create.mock.calls[1]?.[1]).toMatchObject({
      electoralRoll: em.create.mock.calls[0]?.[1],
      userPrincipalId: 'user-1',
      grantedAt: roll.createdAt,
    });
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  it('persists a member batch with one unit-of-work flush', async () => {
    const persist = jest.fn();
    const flush = jest.fn().mockResolvedValue(undefined);
    const em = {
      create: jest.fn((_entity: unknown, data: object) => data),
      persist,
      flush,
      getReference: jest.fn((_entity: unknown, id: string) => ({ id })),
    };
    const createdAt = new Date('2026-08-30T00:00:00.000Z');
    const members = [
      ElectoralRollMemberAggregate.create({
        id: 'member-1',
        electoralRollId: 'roll-1',
        identifier: 'member-1',
        createdAt,
      }),
      ElectoralRollMemberAggregate.create({
        id: 'member-2',
        electoralRollId: 'roll-1',
        identifier: 'member-2',
        voteWeight: 2,
        createdAt,
      }),
    ];

    await new ElectoralRollRepositoryAdapter(em as any).saveMembers(members);

    expect(em.create).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('pages only metadata from rolls granted to the principal', async () => {
    const findAndCount = jest
      .fn<Promise<[unknown[], number]>, [unknown, unknown, unknown?]>()
      .mockResolvedValue([
        [
          {
            id: 'roll-1',
            name: '2026 상반기 선거인명부',
            revision: 2,
            memberCount: 120,
            createdAt: new Date('2026-08-30T00:00:00.000Z'),
            updatedAt: new Date('2026-08-30T10:00:00.000Z'),
          },
        ],
        1,
      ]);
    const adapter = new ElectoralRollReadRepositoryAdapter(
      {
        findAndCount,
      } as any,
      identityDataProtectorStub(),
    );

    const result = await adapter.findPage({
      userPrincipalId: 'user-1',
      query: '상반기',
      page: 1,
      pageSize: 20,
    });

    expect(findAndCount.mock.calls[0]?.[1]).toEqual({
      deletedAt: null,
      accessGrants: { userPrincipalId: 'user-1' },
      name: { $ilike: '%상반기%' },
    });
    expect(findAndCount.mock.calls[0]?.[2]).toMatchObject({
      limit: 20,
      offset: 0,
      orderBy: { updatedAt: 'desc', id: 'desc' },
    });
    expect(result).toMatchObject({
      items: [
        {
          id: 'roll-1',
          name: '2026 상반기 선거인명부',
          revision: 2,
          memberCount: 120,
          updatedAt: new Date('2026-08-30T10:00:00.000Z'),
        },
      ],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });
    expect(result.items[0]).not.toHaveProperty('members');
  });

  it('maps an electoral roll and its editable members into a read view', async () => {
    const findOne = jest
      .fn<Promise<unknown>, [unknown, unknown, unknown?]>()
      .mockResolvedValue({
        id: 'roll-1',
        name: 'Members',
        revision: 2,
        members: [
          {
            id: 'member-1',
            identifier: 'member-1',
            groupKey: 'group-1',
            voteWeight: '2.5',
            encryptedName: 'encrypted-name',
            encryptedPhoneNumber: 'encrypted-phone',
            encryptedBirthDate: 'encrypted-birth-date',
            createdAt: new Date('2026-08-30T00:00:00.000Z'),
            updatedAt: new Date('2026-08-30T01:00:00.000Z'),
          },
        ],
        createdAt: new Date('2026-08-30T00:00:00.000Z'),
        updatedAt: new Date('2026-08-30T01:00:00.000Z'),
      });
    const em = {
      findOne,
    };

    const result = await new ElectoralRollReadRepositoryAdapter(
      em as any,
      identityDataProtectorStub(),
    ).findDetailById('roll-1', 'user-1');

    expect(findOne.mock.calls[0]?.[1]).toEqual({
      id: 'roll-1',
      deletedAt: null,
      accessGrants: { userPrincipalId: 'user-1' },
    });
    expect(findOne.mock.calls[0]?.[2]).toMatchObject({
      populate: ['members'],
      strategy: LoadStrategy.SELECT_IN,
    });
    expect(result).toMatchObject({
      id: 'roll-1',
      revision: 2,
      members: [
        {
          identifier: 'member-1',
          groupKey: 'group-1',
          voteWeight: 2.5,
          name: '홍길동',
          phoneNumber: '010-1234-5678',
          birthDate: '1990-01-02',
        },
      ],
    });
  });

  it('materializes vote electors only from immutable snapshot members', async () => {
    const find = jest
      .fn<Promise<unknown[]>, [unknown, unknown, unknown?]>()
      .mockResolvedValue([
        {
          id: 'snapshot-member-1',
          sourceMemberId: 'source-member-1',
          identifier: 'member-1',
          groupKey: 'group-1',
          voteWeight: '2',
          identityNameHash: 'name-hash',
          identityPhoneNumberHash: 'phone-hash',
          identityBirthDateHash: 'birth-date-hash',
          encryptedName: 'encrypted-name',
          encryptedPhoneNumber: 'encrypted-phone',
          encryptedBirthDate: 'encrypted-birth-date',
        },
      ]);
    const nativeDelete = jest
      .fn<Promise<number>, [unknown, unknown]>()
      .mockResolvedValue(0);
    const persist = jest.fn<unknown, [unknown]>();
    const em = {
      count: jest.fn().mockResolvedValue(0),
      find,
      nativeDelete,
      getReference: jest.fn((_entity: unknown, id: string) => ({ id })),
      create: jest.fn((_entity: unknown, data: object) => data),
      persist,
      flush: jest.fn(),
    };

    await new ElectoralRollSnapshotRepositoryAdapter(
      em as any,
    ).materializeVoteElectors('vote-1', 'snapshot-1');

    expect(find.mock.calls[0]?.[1]).toEqual({
      snapshot: { id: 'snapshot-1' },
    });
    expect(nativeDelete.mock.calls[0]?.[1]).toEqual({ vote: { id: 'vote-1' } });
    expect(persist.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        vote: { id: 'vote-1' },
        snapshotMember: { id: 'snapshot-member-1' },
        identifier: 'member-1',
        groupKey: 'group-1',
        voteWeight: 2,
        status: 'ELIGIBLE',
        identityNameHash: 'name-hash',
        phoneNumberHash: 'phone-hash',
        identityBirthDateHash: 'birth-date-hash',
        name: 'encrypted-name',
        phoneNumber: 'encrypted-phone',
        birthDate: 'encrypted-birth-date',
      }),
    );
  });

  it('refuses to replace electors after operational history exists', async () => {
    const em = {
      count: jest.fn().mockResolvedValue(1),
    };

    await expect(
      new ElectoralRollSnapshotRepositoryAdapter(
        em as any,
      ).materializeVoteElectors('vote-1', 'snapshot-1'),
    ).rejects.toThrow('with operational history cannot be replaced');
  });
});

function identityDataProtectorStub() {
  return {
    protectName: jest.fn(),
    protectPhoneNumber: jest.fn(),
    protectBirthDate: jest.fn(),
    reveal: jest.fn((value: string) => {
      const values: Record<string, string> = {
        'encrypted-name': '홍길동',
        'encrypted-phone': '010-1234-5678',
        'encrypted-birth-date': '1990-01-02',
      };
      return values[value] ?? value;
    }),
  };
}
