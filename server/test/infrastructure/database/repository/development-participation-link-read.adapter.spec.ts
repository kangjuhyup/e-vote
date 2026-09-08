import type { EntityManager } from '@mikro-orm/postgresql';
import { DevelopmentParticipationLinkReadAdapter } from '../../../../src/modules/participation/infrastructure/database/repository/query/development-participation-link-read.adapter';

describe('DevelopmentParticipationLinkReadAdapter', () => {
  it('reads only the current non-revoked invitation without personal data', async () => {
    let executedSql = '';
    const execute = jest.fn((sql: string) => {
      executedSql = sql;
      return Promise.resolve([
        {
          id: 'invitation-1',
          vote_id: 'vote-1',
          elector_id: 'elector-1',
          token_digest: 'stored-digest',
          signing_key_id: 'current',
          generation: 3,
        },
      ]);
    });
    const em = {
      getConnection: () => ({ execute }),
      getTransactionContext: () => undefined,
    } as unknown as EntityManager;
    const adapter = new DevelopmentParticipationLinkReadAdapter(em);

    await expect(
      adapter.findCurrentInvitation({
        voteId: 'vote-1',
        electorId: 'elector-1',
      }),
    ).resolves.toEqual({
      id: 'invitation-1',
      voteId: 'vote-1',
      electorId: 'elector-1',
      tokenDigest: 'stored-digest',
      signingKeyId: 'current',
      generation: 3,
    });
    expect(executedSql).toContain('revoked_at is null');
    expect(executedSql).toContain('generation > 0');
    expect(executedSql).not.toContain('phone_number');
    expect(execute).toHaveBeenCalledWith(
      expect.any(String),
      ['vote-1', 'elector-1'],
      'all',
      undefined,
    );
  });

  it('returns undefined when no current invitation exists', async () => {
    const em = {
      getConnection: () => ({ execute: jest.fn().mockResolvedValue([]) }),
      getTransactionContext: () => undefined,
    } as unknown as EntityManager;

    await expect(
      new DevelopmentParticipationLinkReadAdapter(em).findCurrentInvitation({
        voteId: 'vote-1',
        electorId: 'elector-1',
      }),
    ).resolves.toBeUndefined();
  });

  it('binds a reminder delivery generation to the current invitation without reading personal data', async () => {
    let executedSql = '';
    const execute = jest.fn((sql: string) => {
      executedSql = sql;
      return Promise.resolve([
        {
          invitation_generation: 4,
          invitation_id: 'invitation-1',
          vote_id: 'vote-1',
          elector_id: 'elector-1',
          token_digest: 'stored-digest',
          signing_key_id: 'current',
          current_generation: 4,
          revoked_at: null,
        },
      ]);
    });
    const em = {
      getConnection: () => ({ execute }),
      getTransactionContext: () => undefined,
    } as unknown as EntityManager;

    await expect(
      new DevelopmentParticipationLinkReadAdapter(em).findDispatchInvitation({
        voteId: 'vote-1',
        smsDispatchId: 'dispatch-1',
        electorId: 'elector-1',
      }),
    ).resolves.toEqual({
      invitationGeneration: 4,
      currentInvitation: {
        id: 'invitation-1',
        voteId: 'vote-1',
        electorId: 'elector-1',
        tokenDigest: 'stored-digest',
        signingKeyId: 'current',
        generation: 4,
      },
    });
    expect(executedSql).toContain("d.purpose = 'VOTE_PARTICIPATION_REMINDER'");
    expect(executedSql).toContain('participation_invitation_generation');
    expect(executedSql).not.toContain('phone_number');
    expect(execute).toHaveBeenCalledWith(
      expect.any(String),
      ['dispatch-1', 'vote-1', 'elector-1'],
      'all',
      undefined,
    );
  });

  it('preserves a legacy reminder delivery as stale when no generation was recorded', async () => {
    const em = {
      getConnection: () => ({
        execute: jest.fn().mockResolvedValue([
          {
            invitation_generation: null,
            invitation_id: 'invitation-1',
            vote_id: 'vote-1',
            elector_id: 'elector-1',
            token_digest: 'stored-digest',
            signing_key_id: 'current',
            current_generation: 4,
            revoked_at: null,
          },
        ]),
      }),
      getTransactionContext: () => undefined,
    } as unknown as EntityManager;

    const result = await new DevelopmentParticipationLinkReadAdapter(
      em,
    ).findDispatchInvitation({
      voteId: 'vote-1',
      smsDispatchId: 'dispatch-legacy',
      electorId: 'elector-1',
    });
    expect(result?.invitationGeneration).toBeUndefined();
    expect(result?.currentInvitation).toMatchObject({
      id: 'invitation-1',
      generation: 4,
    });
  });
});
