import { MikroORM, type EntityManager } from '@mikro-orm/postgresql';
import { GetVoteResultHandler } from '../src/modules/participation/application/query/handler/get-vote-result.handler';
import { GetVoteResultQuery } from '../src/modules/participation/application/query/dto/request/get-vote-result.query';
import { VoteStatisticsInconsistentError } from '../src/modules/participation/application/query/vote-statistics.error';
import { CastParticipationCommand } from '../src/modules/participation/application/command/dto/request/cast-participation.command';
import { CastParticipationHandler } from '../src/modules/participation/application/command/handler/cast-participation.handler';
import { ParticipationAggregate } from '../src/modules/participation/domain/participation.aggregate';
import { ElectorAggregate } from '../src/modules/elector/domain/elector.aggregate';
import { ElectorStatus } from '../src/shared/domain/voting/type/elector-status.type';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../src/shared/domain/voting/type/vote-policy.type';
import { VotingChannel } from '../src/shared/domain/voting/type/voting-channel.type';
import { VotePolicy } from '../src/shared/domain/voting/vo/vote-policy.vo';
import { createDatabaseConfig } from '../src/platform/database/database.config';
import { ParticipationRepositoryAdapter } from '../src/modules/participation/infrastructure/database/repository/command/participation-repository.adapter';
import { VoteStatisticsReadRepositoryAdapter } from '../src/modules/participation/infrastructure/database/repository/query/vote-statistics-read-repository.adapter';
import { VoteRepositoryAdapter } from '../src/modules/vote/infrastructure/database/repository/command/vote-repository.adapter';
import { VoteDetailRepositoryAdapter } from '../src/modules/vote/infrastructure/database/repository/command/vote-detail-repository.adapter';
import { ElectorRepositoryAdapter } from '../src/modules/elector/infrastructure/database/repository/command/elector-repository.adapter';
import { CandidateRepositoryAdapter } from '../src/modules/vote/infrastructure/database/repository/command/candidate-repository.adapter';
import { FieldVotingSessionRepositoryAdapter } from '../src/modules/field-voting/infrastructure/database/repository/command/field-voting-session-repository.adapter';

const describeDatabase =
  process.env.VOTE_STATISTICS_E2E_DATABASE === 'true'
    ? describe
    : describe.skip;

describeDatabase('vote statistics database integration', () => {
  let orm: MikroORM | undefined;
  let em: EntityManager;

  beforeAll(async () => {
    assertDedicatedTestDatabase();
    const config = await createDatabaseConfig();
    orm = await MikroORM.init({
      ...config,
      migrations: {
        ...config.migrations,
        snapshot: false,
      },
    });
    await orm.migrator.up();
    em = orm.em.fork();
  });

  beforeEach(async () => {
    await clearTestFixtures(em);
    await seedStatisticsFixtures(em);
  });

  it('executes group/share turnout and result aggregation in PostgreSQL', async () => {
    const adapter = new VoteStatisticsReadRepositoryAdapter(em);

    await expect(adapter.getTurnout(VOTE_ID, VOTE_DETAIL_ID)).resolves.toEqual({
      voteId: VOTE_ID,
      voteDetailId: VOTE_DETAIL_ID,
      participationUnit: ParticipationUnit.Group,
      voteWeightMode: VoteWeightMode.Share,
      groupVoteWeightConsistent: true,
      eligibleElectorCount: 4,
      eligibleVotingUnitCount: 3,
      participantCount: 2,
      participatedVotingUnitCount: 2,
      turnoutRate: 66.67,
      eligibleVoteWeight: 15,
      participatedVoteWeight: 10,
      weightedTurnoutRate: 66.67,
    });

    await expect(
      adapter.getResult(VOTE_ID, VOTE_DETAIL_ID),
    ).resolves.toMatchObject({
      voteId: VOTE_ID,
      voteDetailId: VOTE_DETAIL_ID,
      voteStatus: 'CLOSED',
      voteDetailStatus: 'CLOSED',
      privacyMode: PrivacyMode.Secret,
      participantCount: 2,
      participatedVoteWeight: 10,
      totalVoteCount: 2,
      totalWeightedVoteCount: 10,
      candidates: [
        {
          candidateId: CANDIDATE_ONE_ID,
          voteCount: 1,
          voteRate: 50,
          weightedVoteCount: 3,
          weightedVoteRate: 30,
        },
        {
          candidateId: CANDIDATE_TWO_ID,
          voteCount: 1,
          voteRate: 50,
          weightedVoteCount: 7,
          weightedVoteRate: 70,
        },
      ],
      votingChannels: [
        {
          channel: VotingChannel.Online,
          participantCount: 2,
          participationRate: 100,
          participatedVoteWeight: 10,
          weightedParticipationRate: 100,
        },
      ],
    });
  });

  it('stores a secret participation and increments its candidate result atomically', async () => {
    const participation = createSecretParticipation(PARTICIPATION_THREE_ID);

    await new ParticipationRepositoryAdapter(em).saveCastWithResult(
      participation,
      CANDIDATE_ONE_ID,
    );

    const [storedParticipation] = await em
      .getConnection()
      .execute<Array<{ candidate_id: string | null }>>(
        'select candidate_id from vote_participations where id = ?',
        [PARTICIPATION_THREE_ID],
      );
    const result = await new VoteStatisticsReadRepositoryAdapter(em).getResult(
      VOTE_ID,
      VOTE_DETAIL_ID,
    );

    expect(storedParticipation?.candidate_id).toBeNull();
    expect(result).toMatchObject({
      participantCount: 3,
      participatedVoteWeight: 15,
      totalVoteCount: 3,
      totalWeightedVoteCount: 15,
      candidates: [
        {
          candidateId: CANDIDATE_ONE_ID,
          voteCount: 2,
          weightedVoteCount: 8,
        },
        {
          candidateId: CANDIDATE_TWO_ID,
          voteCount: 1,
          weightedVoteCount: 7,
        },
      ],
    });
  });

  it('rolls back the result increment when a duplicate participation fails', async () => {
    const repository = new ParticipationRepositoryAdapter(em);
    await repository.saveCastWithResult(
      createSecretParticipation(PARTICIPATION_THREE_ID),
      CANDIDATE_ONE_ID,
    );
    const resultBeforeDuplicate = await readCandidateResult(
      em,
      CANDIDATE_ONE_ID,
    );

    await expect(
      repository.saveCastWithResult(
        createSecretParticipation(PARTICIPATION_DUPLICATE_ID),
        CANDIDATE_ONE_ID,
      ),
    ).rejects.toThrow();

    await expect(
      countParticipation(em, PARTICIPATION_DUPLICATE_ID),
    ).resolves.toBe(0);
    await expect(readCandidateResult(em, CANDIDATE_ONE_ID)).resolves.toEqual(
      resultBeforeDuplicate,
    );
  });

  it('rolls back participation when the candidate result update fails', async () => {
    await expect(
      new ParticipationRepositoryAdapter(em).saveCastWithResult(
        createSecretParticipation(PARTICIPATION_THREE_ID),
        MISSING_CANDIDATE_ID,
      ),
    ).rejects.toThrow();

    await expect(countParticipation(em, PARTICIPATION_THREE_ID)).resolves.toBe(
      0,
    );
    await expect(readCandidateResult(em, CANDIDATE_ONE_ID)).resolves.toEqual({
      voteCount: 1,
      weightedVoteCount: 3,
    });
  });

  it('does not lose result increments from concurrent casts for one candidate', async () => {
    await insertElector(em, {
      id: ELECTOR_FIVE_ID,
      identifier: 'member-5',
      groupKey: 'group-d',
      voteWeight: 11,
    });

    await Promise.all([
      new ParticipationRepositoryAdapter(em.fork()).saveCastWithResult(
        createSecretParticipation(PARTICIPATION_THREE_ID),
        CANDIDATE_ONE_ID,
      ),
      new ParticipationRepositoryAdapter(em.fork()).saveCastWithResult(
        createSecretParticipation(PARTICIPATION_CONCURRENT_ID, {
          electorId: ELECTOR_FIVE_ID,
          identifier: 'member-5',
          groupKey: 'group-d',
          voteWeight: 11,
        }),
        CANDIDATE_ONE_ID,
      ),
    ]);

    await expect(readCandidateResult(em, CANDIDATE_ONE_ID)).resolves.toEqual({
      voteCount: 3,
      weightedVoteCount: 19,
    });
  });

  it('blocks result disclosure when participation and result projections differ', async () => {
    await em
      .getConnection()
      .execute('delete from vote_results where candidate_id = ?', [
        CANDIDATE_TWO_ID,
      ]);
    const handler = new GetVoteResultHandler(
      new VoteStatisticsReadRepositoryAdapter(em),
    );

    await expect(
      handler.execute(
        GetVoteResultQuery.of({
          voteId: VOTE_ID,
          voteDetailId: VOTE_DETAIL_ID,
        }),
      ),
    ).rejects.toBeInstanceOf(VoteStatisticsInconsistentError);
  });

  it('rejects cast work for inconsistent group vote weights', async () => {
    await em
      .getConnection()
      .execute('update electors set vote_weight = 4 where id = ?', [
        ELECTOR_TWO_ID,
      ]);
    const work = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);

    await expect(
      new ParticipationRepositoryAdapter(em).runCastTransaction(
        {
          voteId: VOTE_ID,
          voteDetailId: VOTE_DETAIL_ID,
          electorId: ELECTOR_ONE_ID,
          candidateId: CANDIDATE_ONE_ID,
          fieldVotingSessionId: undefined,
        },
        work,
      ),
    ).rejects.toThrow(
      'electors in the same group must have the same vote weight',
    );
    expect(work).not.toHaveBeenCalled();
  });

  it('casts through the handler with locked reads and atomic result persistence', async () => {
    await em
      .getConnection()
      .execute("update votes set status = 'OPEN' where id = ?", [VOTE_ID]);
    await em
      .getConnection()
      .execute("update vote_details set status = 'OPEN' where id = ?", [
        VOTE_DETAIL_ID,
      ]);
    await em.getConnection().execute(
      `insert into vote_voting_channels (id, vote_id, channel, created_at)
       values (?, ?, 'ONLINE', current_timestamp)`,
      [VOTING_CHANNEL_ID, VOTE_ID],
    );
    em.clear();
    const handlerEm = em.fork();
    const handler = new CastParticipationHandler(
      new VoteRepositoryAdapter(handlerEm),
      new VoteDetailRepositoryAdapter(handlerEm),
      new ElectorRepositoryAdapter(handlerEm),
      new CandidateRepositoryAdapter(handlerEm),
      new ParticipationRepositoryAdapter(handlerEm),
      new FieldVotingSessionRepositoryAdapter(handlerEm),
    );

    await expect(
      handler.execute(
        CastParticipationCommand.of({
          voteId: VOTE_ID,
          voteDetailId: VOTE_DETAIL_ID,
          electorId: ELECTOR_FOUR_ID,
          selectedCandidateId: CANDIDATE_ONE_ID,
          votingChannel: VotingChannel.Online,
          participatedAt: new Date('2026-08-29T03:00:00.000Z'),
        }),
      ),
    ).resolves.toMatchObject({ voteDetailId: VOTE_DETAIL_ID, status: 'CAST' });

    const result = await readCandidateResult(em, CANDIDATE_ONE_ID);
    const [storedParticipation] = await em
      .getConnection()
      .execute<Array<{ candidate_id: string | null }>>(
        `select candidate_id
       from vote_participations
       where vote_detail_id = ? and elector_id = ?`,
        [VOTE_DETAIL_ID, ELECTOR_FOUR_ID],
      );

    expect(storedParticipation?.candidate_id).toBeNull();
    expect(result).toEqual({ voteCount: 2, weightedVoteCount: 8 });
  });

  it('serializes concurrent elector saves for one group vote weight', async () => {
    const firstElector = ElectorAggregate.create({
      id: ELECTOR_SIX_ID,
      voteId: VOTE_ID,
      identifier: 'member-6',
      groupKey: 'group-e',
      voteWeight: 2,
      status: ElectorStatus.Eligible,
    });
    const secondElector = ElectorAggregate.create({
      id: ELECTOR_SEVEN_ID,
      voteId: VOTE_ID,
      identifier: 'member-7',
      groupKey: 'group-e',
      voteWeight: 4,
      status: ElectorStatus.Eligible,
    });

    const settlements = await Promise.allSettled([
      new ElectorRepositoryAdapter(em.fork()).save(firstElector),
      new ElectorRepositoryAdapter(em.fork()).save(secondElector),
    ]);
    const storedRows = await em
      .getConnection()
      .execute<Array<{ vote_weight: string }>>(
        'select vote_weight from electors where vote_id = ? and group_key = ?',
        [VOTE_ID, 'group-e'],
      );

    expect(
      settlements.filter((settlement) => settlement.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      settlements.filter((settlement) => settlement.status === 'rejected'),
    ).toHaveLength(1);
    expect(storedRows).toHaveLength(1);
    expect([2, 4]).toContain(Number(storedRows[0]?.vote_weight));
  });

  afterAll(async () => {
    if (!orm) {
      return;
    }

    await clearTestFixtures(em);
    await orm.close(true);
  });
});

const COMMISSION_ID = '00000000-0000-4000-8000-000000000001';
const VOTE_ID = '00000000-0000-4000-8000-000000000010';
const VOTE_DETAIL_ID = '00000000-0000-4000-8000-000000000020';
const VOTING_CHANNEL_ID = '00000000-0000-4000-8000-000000000021';
const CANDIDATE_ONE_ID = '00000000-0000-4000-8000-000000000030';
const CANDIDATE_TWO_ID = '00000000-0000-4000-8000-000000000031';
const ELECTOR_ONE_ID = '00000000-0000-4000-8000-000000000040';
const ELECTOR_TWO_ID = '00000000-0000-4000-8000-000000000041';
const ELECTOR_THREE_ID = '00000000-0000-4000-8000-000000000042';
const ELECTOR_FOUR_ID = '00000000-0000-4000-8000-000000000043';
const ELECTOR_FIVE_ID = '00000000-0000-4000-8000-000000000044';
const ELECTOR_SIX_ID = '00000000-0000-4000-8000-000000000045';
const ELECTOR_SEVEN_ID = '00000000-0000-4000-8000-000000000046';
const PARTICIPATION_ONE_ID = '00000000-0000-4000-8000-000000000050';
const PARTICIPATION_TWO_ID = '00000000-0000-4000-8000-000000000051';
const PARTICIPATION_THREE_ID = '00000000-0000-4000-8000-000000000052';
const PARTICIPATION_DUPLICATE_ID = '00000000-0000-4000-8000-000000000053';
const PARTICIPATION_CONCURRENT_ID = '00000000-0000-4000-8000-000000000054';
const RESULT_ONE_ID = '00000000-0000-4000-8000-000000000060';
const RESULT_TWO_ID = '00000000-0000-4000-8000-000000000061';
const MISSING_CANDIDATE_ID = '00000000-0000-4000-8000-000000000099';

function assertDedicatedTestDatabase(): void {
  const databaseName = process.env.DATABASE_NAME;

  if (!databaseName?.endsWith('_test')) {
    throw new Error(
      'vote statistics database tests require DATABASE_NAME ending in _test',
    );
  }
}

async function clearTestFixtures(entityManager: EntityManager): Promise<void> {
  await entityManager
    .getConnection()
    .execute('truncate table election_commissions cascade');
  entityManager.clear();
}

function createSecretParticipation(
  id: string,
  electorParams: {
    readonly electorId: string;
    readonly identifier: string;
    readonly groupKey: string;
    readonly voteWeight: number;
  } = {
    electorId: ELECTOR_FOUR_ID,
    identifier: 'member-4',
    groupKey: 'group-c',
    voteWeight: 5,
  },
): ParticipationAggregate {
  const elector = ElectorAggregate.create({
    id: electorParams.electorId,
    voteId: VOTE_ID,
    identifier: electorParams.identifier,
    groupKey: electorParams.groupKey,
    voteWeight: electorParams.voteWeight,
    status: ElectorStatus.Eligible,
  });

  return ParticipationAggregate.cast({
    id,
    voteDetailId: VOTE_DETAIL_ID,
    elector,
    selectedCandidateId: CANDIDATE_ONE_ID,
    effectivePolicy: VotePolicy.of({
      privacyMode: PrivacyMode.Secret,
      participationUnit: ParticipationUnit.Group,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Share,
    }),
    votingChannel: VotingChannel.Online,
    participatedAt: new Date('2026-08-29T03:00:00.000Z'),
  });
}

async function insertElector(
  entityManager: EntityManager,
  elector: {
    readonly id: string;
    readonly identifier: string;
    readonly groupKey: string;
    readonly voteWeight: number;
  },
): Promise<void> {
  await entityManager.getConnection().execute(
    `insert into electors (
       id, vote_id, name, identifier, group_key, vote_weight, status, created_at, updated_at
     ) values (?, ?, 'Concurrent elector', ?, ?, ?, 'ELIGIBLE', current_timestamp, current_timestamp)`,
    [
      elector.id,
      VOTE_ID,
      elector.identifier,
      elector.groupKey,
      elector.voteWeight,
    ],
  );
}

async function countParticipation(
  entityManager: EntityManager,
  participationId: string,
): Promise<number> {
  const [row] = await entityManager
    .getConnection()
    .execute<Array<{ count: string }>>(
      'select count(*) as count from vote_participations where id = ?',
      [participationId],
    );

  return Number(row?.count ?? 0);
}

async function readCandidateResult(
  entityManager: EntityManager,
  candidateId: string,
): Promise<{ voteCount: number; weightedVoteCount: number }> {
  const [row] = await entityManager
    .getConnection()
    .execute<Array<{ vote_count: string; weighted_vote_count: string }>>(
      `select vote_count, weighted_vote_count
     from vote_results
     where vote_detail_id = ? and candidate_id = ?`,
      [VOTE_DETAIL_ID, candidateId],
    );

  return {
    voteCount: Number(row?.vote_count ?? 0),
    weightedVoteCount: Number(row?.weighted_vote_count ?? 0),
  };
}

async function seedStatisticsFixtures(
  entityManager: EntityManager,
): Promise<void> {
  const statements = [
    `insert into election_commissions (id, name, status, created_at, updated_at)
     values ('${COMMISSION_ID}', 'Commission', 'ACTIVE', current_timestamp, current_timestamp)`,
    `insert into votes (
       id, commission_id, title, description, default_privacy_mode,
       default_participation_unit, default_result_storage_mode,
       default_vote_weight_mode, identity_verification_required,
       identity_verification_provider, identity_verification_method,
       status, started_at, ended_at, created_at, updated_at
     ) values (
       '${VOTE_ID}', '${COMMISSION_ID}', 'Share vote', '', 'SECRET',
       'GROUP', 'DATABASE', 'SHARE', false, null, null,
       'CLOSED', '2026-08-29T00:00:00Z', '2026-08-29T09:00:00Z',
       current_timestamp, current_timestamp
     )`,
    `insert into vote_details (
       id, vote_id, title, description, type, privacy_mode_override,
       participation_unit_override, result_storage_mode_override,
       vote_weight_mode_override, sort_order, status, created_at, updated_at
     ) values (
       '${VOTE_DETAIL_ID}', '${VOTE_ID}', 'President', '', 'CANDIDATE',
       null, null, null, null, 0, 'CLOSED', current_timestamp, current_timestamp
     )`,
    `insert into electors (
       id, vote_id, name, identifier, group_key, vote_weight, status, created_at, updated_at
     ) values
       ('${ELECTOR_ONE_ID}', '${VOTE_ID}', 'One', 'member-1', 'group-a', 3, 'ELIGIBLE', current_timestamp, current_timestamp),
       ('${ELECTOR_TWO_ID}', '${VOTE_ID}', 'Two', 'member-2', 'group-a', 3, 'ELIGIBLE', current_timestamp, current_timestamp),
       ('${ELECTOR_THREE_ID}', '${VOTE_ID}', 'Three', 'member-3', 'group-b', 7, 'ELIGIBLE', current_timestamp, current_timestamp),
       ('${ELECTOR_FOUR_ID}', '${VOTE_ID}', 'Four', 'member-4', 'group-c', 5, 'ELIGIBLE', current_timestamp, current_timestamp)`,
    `insert into candidates (
       id, vote_detail_id, candidate_no, name, description, status, created_at, updated_at
     ) values
       ('${CANDIDATE_ONE_ID}', '${VOTE_DETAIL_ID}', 1, 'Candidate 1', '', 'ACTIVE', current_timestamp, current_timestamp),
       ('${CANDIDATE_TWO_ID}', '${VOTE_DETAIL_ID}', 2, 'Candidate 2', '', 'ACTIVE', current_timestamp, current_timestamp)`,
    `insert into vote_participations (
       id, vote_detail_id, elector_id, candidate_id, group_key, vote_weight,
       voting_channel, field_voting_session_id, status, participated_at, created_at, updated_at
     ) values
       ('${PARTICIPATION_ONE_ID}', '${VOTE_DETAIL_ID}', '${ELECTOR_ONE_ID}', null, 'group-a', 3, 'ONLINE', null, 'CAST', '2026-08-29T01:00:00Z', current_timestamp, current_timestamp),
       ('${PARTICIPATION_TWO_ID}', '${VOTE_DETAIL_ID}', '${ELECTOR_THREE_ID}', null, 'group-b', 7, 'ONLINE', null, 'CAST', '2026-08-29T02:00:00Z', current_timestamp, current_timestamp)`,
    `insert into vote_results (
       id, vote_detail_id, candidate_id, vote_count, weighted_vote_count, created_at, updated_at
     ) values
       ('${RESULT_ONE_ID}', '${VOTE_DETAIL_ID}', '${CANDIDATE_ONE_ID}', 1, 3, current_timestamp, current_timestamp),
       ('${RESULT_TWO_ID}', '${VOTE_DETAIL_ID}', '${CANDIDATE_TWO_ID}', 1, 7, current_timestamp, current_timestamp)`,
  ];

  for (const statement of statements) {
    await entityManager.getConnection().execute(statement);
  }
}
