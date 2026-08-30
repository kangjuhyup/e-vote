import { LoadStrategy } from '@mikro-orm/core';
import { ElectoralRollSnapshotRepositoryAdapter } from '../../../../src/modules/electoral-roll/infrastructure/database/repository/command/electoral-roll-snapshot-repository.adapter';
import { ElectoralRollReadRepositoryAdapter } from '../../../../src/modules/electoral-roll/infrastructure/database/repository/query/electoral-roll-read-repository.adapter';

describe('electoral roll repository adapters', () => {
  it('maps an electoral roll and its editable members into a read view', async () => {
    const findOne = jest
      .fn<Promise<unknown>, [unknown, unknown, unknown?]>()
      .mockResolvedValue({
        id: 'roll-1',
        commission: { id: 'commission-1' },
        name: 'Members',
        revision: 2,
        members: [
          {
            id: 'member-1',
            identifier: 'member-1',
            groupKey: 'group-1',
            voteWeight: '2.5',
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
    ).findDetailById('roll-1');

    expect(findOne.mock.calls[0]?.[1]).toEqual({ id: 'roll-1' });
    expect(findOne.mock.calls[0]?.[2]).toMatchObject({
      populate: ['commission', 'members'],
      strategy: LoadStrategy.JOINED,
    });
    expect(result).toMatchObject({
      id: 'roll-1',
      commissionId: 'commission-1',
      revision: 2,
      members: [
        {
          identifier: 'member-1',
          groupKey: 'group-1',
          voteWeight: 2.5,
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
