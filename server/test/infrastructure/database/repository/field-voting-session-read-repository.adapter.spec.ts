import { LoadStrategy } from '@mikro-orm/core';
import { FieldVotingSessionStatus } from '../../../../src/shared/domain/voting/type/field-voting-session-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { FieldVotingSessionReadRepositoryAdapter } from '../../../../src/modules/field-voting/infrastructure/database/repository/query/field-voting-session-read-repository.adapter';

describe('FieldVotingSessionReadRepositoryAdapter', () => {
  it('maps detail and filters pages by vote', async () => {
    const entity = createEntity();
    const findAndCount = jest
      .fn<Promise<[unknown[], number]>, [unknown, unknown, unknown?]>()
      .mockResolvedValue([[entity], 1]);
    const em = {
      findOne: jest.fn().mockResolvedValue(entity),
      findAndCount,
    };
    const adapter = new FieldVotingSessionReadRepositoryAdapter(em as any);

    await expect(adapter.findDetailById('session-1')).resolves.toMatchObject({
      id: 'session-1',
      managerIds: ['member-1', 'member-2'],
    });
    const page = await adapter.findPage({
      voteId: 'vote-1',
      page: 1,
      pageSize: 20,
    });
    expect(findAndCount.mock.calls[0][1]).toEqual({
      vote: { id: 'vote-1' },
    });
    expect(findAndCount.mock.calls[0][2]).toMatchObject({
      strategy: LoadStrategy.JOINED,
      limit: 20,
      offset: 0,
      orderBy: { startsAt: 'asc', id: 'asc' },
    });
    expect(page.totalItems).toBe(1);
  });
});

function createEntity() {
  return {
    id: 'session-1',
    commission: { id: 'commission-1' },
    vote: { id: 'vote-1' },
    channel: VotingChannel.Onsite,
    title: 'Lobby',
    locationName: 'Main Lobby',
    address: 'Seoul',
    managerLinks: [
      { commissionMember: { id: 'member-2' } },
      { commissionMember: { id: 'member-1' } },
    ],
    startsAt: new Date('2026-08-30T00:00:00.000Z'),
    endsAt: new Date('2026-08-30T09:00:00.000Z'),
    status: FieldVotingSessionStatus.Scheduled,
    createdAt: new Date('2026-08-29T00:00:00.000Z'),
    updatedAt: new Date('2026-08-29T00:00:00.000Z'),
  };
}
