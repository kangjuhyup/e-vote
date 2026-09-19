import { VoteContentChangePolicy } from '../../../src/modules/vote/domain/vote/vote-content-change.policy';

const now = new Date('2026-09-19T00:00:00.000Z');
const startedAt = new Date('2026-09-18T00:00:00.000Z');
const fileId = '11111111-1111-4111-8111-111111111111';
const attachmentId = '22222222-2222-4222-8222-222222222222';

describe('VoteContentChangePolicy', () => {
  it('allows changes only while the vote is open and before its end', () => {
    expect(() =>
      VoteContentChangePolicy.assertOpen(
        'OPEN',
        new Date('2026-09-20T00:00:00.000Z'),
        now,
      ),
    ).not.toThrow();
    expect(() =>
      VoteContentChangePolicy.assertOpen(
        'CLOSED',
        new Date('2026-09-20T00:00:00.000Z'),
        now,
      ),
    ).toThrow();
    expect(() =>
      VoteContentChangePolicy.assertOpen('OPEN', now, now),
    ).toThrow();
  });

  it('normalizes a supported proposal', () => {
    expect(
      VoteContentChangePolicy.normalizeProposal(
        {
          title: '  새 제목  ',
          description: '새 안내문',
          endedAt: '2026-09-21T09:00:00+09:00',
          attachmentChanges: [{ action: 'ADD', fileId }],
        },
        startedAt,
        now,
      ),
    ).toEqual({
      title: '새 제목',
      description: '새 안내문',
      endedAt: '2026-09-21T00:00:00.000Z',
      attachmentChanges: [{ action: 'ADD', fileId }],
    });
  });

  it.each([
    { attachmentChanges: [] },
    { title: ' ', attachmentChanges: [] },
    { endedAt: '2026-09-19T00:00:00.000Z', attachmentChanges: [] },
    {
      attachmentChanges: [
        { action: 'REMOVE', attachmentId },
        { action: 'REMOVE', attachmentId },
      ],
    },
    { attachmentChanges: [{ action: 'ADD', fileId: '' }] },
  ])('rejects invalid or empty changes: %j', (proposal) => {
    expect(() =>
      VoteContentChangePolicy.normalizeProposal(
        proposal as never,
        startedAt,
        now,
      ),
    ).toThrow();
  });
});
