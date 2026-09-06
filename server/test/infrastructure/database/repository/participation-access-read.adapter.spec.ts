import { ParticipationAccessReadAdapter } from '../../../../src/modules/participation/infrastructure/database/repository/query/participation-access-read.adapter';

describe('ParticipationAccessReadAdapter', () => {
  it('builds the complete sanitized ballot with one database query', async () => {
    const execute = jest
      .fn<Promise<Record<string, unknown>[]>, [string, readonly unknown[]]>()
      .mockResolvedValue([
        row({
          candidate_id: 'candidate-1',
          candidate_no: 1,
          candidate_name: 'A',
        }),
        row({
          candidate_id: 'candidate-2',
          candidate_no: 2,
          candidate_name: 'B',
        }),
      ]);
    const adapter = new ParticipationAccessReadAdapter({
      getConnection: () => ({ execute }),
      getTransactionContext: () => undefined,
    } as never);

    const result = await adapter.findBallot('vote-1', 'elector-1');

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[1]).toEqual([
      'elector-1',
      'elector-1',
      'vote-1',
    ]);
    expect(result).toMatchObject({
      vote: { id: 'vote-1', title: 'Vote', status: 'OPEN' },
      hasConfirmedSignature: true,
      voteDetails: [
        {
          id: 'detail-1',
          participated: false,
          candidates: [
            { id: 'candidate-1', candidateNo: 1, name: 'A' },
            { id: 'candidate-2', candidateNo: 2, name: 'B' },
          ],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/elector|phone|identifier/i);
  });

  function row(overrides: Record<string, unknown>) {
    return {
      vote_id: 'vote-1',
      vote_title: 'Vote',
      vote_description: 'Description',
      vote_status: 'OPEN',
      started_at: new Date('2026-09-06T00:00:00Z'),
      ended_at: new Date('2026-09-07T00:00:00Z'),
      has_confirmed_signature: true,
      vote_detail_id: 'detail-1',
      vote_detail_title: 'Question',
      vote_detail_description: 'Choose',
      vote_detail_type: 'CANDIDATE',
      vote_detail_status: 'OPEN',
      vote_detail_sort_order: 1,
      participated: false,
      candidate_description: '',
      ...overrides,
    };
  }
});
