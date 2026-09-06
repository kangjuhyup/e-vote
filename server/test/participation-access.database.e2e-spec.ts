import { MikroORM, type EntityManager } from '@mikro-orm/postgresql';
import { createDatabaseConfig } from '../src/platform/database/database.config';
import { ParticipationAccessRepositoryAdapter } from '../src/modules/participation/infrastructure/database/repository/command/participation-access-repository.adapter';
import { ParticipationInvitationAggregate } from '../src/modules/participation/domain/access/participation-invitation.aggregate';

const describeDatabase =
  process.env.PARTICIPATION_ACCESS_DATABASE_E2E === 'true'
    ? describe
    : describe.skip;

const COMMISSION_ID = '11000000-0000-4000-8000-000000000001';
const VOTE_ID = '22000000-0000-4000-8000-000000000001';
const ELECTOR_ID = '33000000-0000-4000-8000-000000000001';
const LEGACY_INVITATION_ID = '44000000-0000-4000-8000-000000000001';
const SESSION_ONE_ID = '55000000-0000-4000-8000-000000000001';
const SESSION_TWO_ID = '55000000-0000-4000-8000-000000000002';

describeDatabase('participation access PostgreSQL regression', () => {
  let orm: MikroORM | undefined;
  let em: EntityManager;

  beforeAll(async () => {
    if (!process.env.DATABASE_NAME?.endsWith('_test')) {
      throw new Error(
        'participation access E2E requires a dedicated *_test database',
      );
    }
    const config = await createDatabaseConfig();
    orm = await MikroORM.init({
      ...config,
      migrations: { ...config.migrations, snapshot: false },
    });
    await resetPublicSchema(orm.em);
    await orm.migrator.up({ to: 'Migration20260906030000' });
    em = orm.em.fork();
    await seedLegacyInvitation(em);
    await orm.migrator.up({ to: 'Migration20260906040000' });
  });

  afterAll(async () => {
    if (!orm) return;
    await resetPublicSchema(orm.em);
    await orm.close(true);
  });

  it('revokes legacy rows without activating or delivering them', async () => {
    const [invitation] = await em.getConnection().execute<
      Array<{
        generation: number;
        revoked_at: Date | null;
        expires_at: Date | null;
      }>
    >('select generation, revoked_at, expires_at from participation_invitations where id = ?', [LEGACY_INVITATION_ID]);
    const [{ count }] = await em
      .getConnection()
      .execute<Array<{ count: string }>>(
        'select count(*) as count from participation_invitation_deliveries',
      );

    expect(invitation?.generation).toBe(0);
    expect(invitation?.revoked_at).not.toBeNull();
    expect(count).toBe('0');
  });

  it('enforces one live participation browser per invitation generation', async () => {
    await em.transactional(async (transactionalEm) => {
      const repository = new ParticipationAccessRepositoryAdapter(
        transactionalEm,
      );
      await expect(
        repository.findInvitationsByElectorsForUpdate(VOTE_ID, [ELECTOR_ID]),
      ).resolves.toEqual([]);
      const invitation = ParticipationInvitationAggregate.issue({
        id: LEGACY_INVITATION_ID,
        voteId: VOTE_ID,
        electorId: ELECTOR_ID,
        tokenDigest: 'current-token-digest',
        issuedByUserPrincipalId: 'creator-1',
        signingKeyId: 'current',
        now: new Date('2026-09-06T01:00:00Z'),
      });
      await repository.saveInvitations([invitation]);
      await repository.enqueueDeliveries([
        {
          id: '66000000-0000-4000-8000-000000000001',
          invitationId: invitation.id,
          invitationGeneration: invitation.generation,
          status: 'PENDING',
          now: new Date('2026-09-06T01:00:00Z'),
        },
      ]);
    });
    const [{ generation }] = await em
      .getConnection()
      .execute<Array<{ generation: number }>>(
        'select generation from participation_invitations where id = ?',
        [LEGACY_INVITATION_ID],
      );
    expect(generation).toBe(1);
    await insertSession(em, SESSION_ONE_ID, 'digest-one');
    await expect(
      insertSession(em, SESSION_TWO_ID, 'digest-two'),
    ).rejects.toMatchObject({
      code: '23505',
    });
  });
});

async function resetPublicSchema(entityManager: EntityManager): Promise<void> {
  await entityManager
    .getConnection()
    .execute('drop schema if exists public cascade; create schema public;');
}

async function seedLegacyInvitation(
  entityManager: EntityManager,
): Promise<void> {
  const now = new Date('2026-09-06T00:00:00.000Z');
  await entityManager.getConnection().execute(
    `insert into election_commissions (id, name, status, created_at, updated_at)
     values (?, 'Participation test', 'ACTIVE', ?, ?)`,
    [COMMISSION_ID, now, now],
  );
  await entityManager.getConnection().execute(
    `insert into votes (
       id, commission_id, created_by_user_principal_id, title, description,
       default_privacy_mode, default_participation_unit,
       default_result_storage_mode, default_vote_weight_mode,
       identity_verification_required, status, started_at, ended_at,
       created_at, updated_at
     ) values (?, ?, 'creator-1', 'Vote', '', 'SECRET', 'INDIVIDUAL',
       'DATABASE', 'EQUAL', false, 'FINALIZED', ?, ?, ?, ?)`,
    [VOTE_ID, COMMISSION_ID, now, new Date('2026-09-07T00:00:00Z'), now, now],
  );
  await entityManager.getConnection().execute(
    `insert into electors
       (id, vote_id, name, identifier, vote_weight, status, created_at, updated_at)
     values (?, ?, 'Elector', 'member-1', 1, 'ELIGIBLE', ?, ?)`,
    [ELECTOR_ID, VOTE_ID, now, now],
  );
  await entityManager.getConnection().execute(
    `insert into participation_invitations
       (id, vote_id, elector_id, token_digest, expires_at, revoked_at, created_at, updated_at)
     values (?, ?, ?, 'legacy-digest', ?, null, ?, ?)`,
    [
      LEGACY_INVITATION_ID,
      VOTE_ID,
      ELECTOR_ID,
      new Date('2026-09-07T00:00:00Z'),
      now,
      now,
    ],
  );
}

async function insertSession(
  entityManager: EntityManager,
  id: string,
  tokenDigest: string,
): Promise<void> {
  await entityManager.getConnection().execute(
    `insert into elector_participant_sessions
       (id, token_digest, csrf_token_digest, invitation_id, vote_id, elector_id,
        invitation_generation, scope, expires_at, created_at, last_used_at)
     values (?, ?, ?, ?, ?, ?, 1, 'PARTICIPATE', ?, current_timestamp, current_timestamp)`,
    [
      id,
      tokenDigest,
      `${tokenDigest}-csrf`,
      LEGACY_INVITATION_ID,
      VOTE_ID,
      ELECTOR_ID,
      new Date('2026-09-07T00:00:00Z'),
    ],
  );
}
