import { ProcessDueVoteSchedulesCommand } from '../../../../src/modules/vote/application/command/dto/request/process-due-vote-schedules.command';
import { ProcessDueVoteSchedulesHandler } from '../../../../src/modules/vote/application/command/handler/process-due-vote-schedules.handler';
import type { VoteScheduleRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-schedule-repository.port';
import { VoteAggregate } from '../../../../src/modules/vote/domain/vote/vote.aggregate';
import { VoteDetailAggregate } from '../../../../src/modules/vote/domain/vote/vote-detail.aggregate';
import type { VoteDetailRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-detail-repository.port';
import type {
  UnpaidVoteBillingExpirationPort,
  VoteUsageEntitlementAccessPort,
} from '../../../../src/shared/application/port/capability/vote-billing.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../src/shared/domain/voting/vo/vote-policy.vo';

describe('ProcessDueVoteSchedulesHandler', () => {
  it('opens only paid due votes and closes due open votes in one transaction', async () => {
    const now = new Date('2026-09-06T10:00:00.000Z');
    const paid = finalizedVote('paid', now);
    const unpaid = billingLockedVote('unpaid', now);
    const closing = finalizedVote(
      'closing',
      new Date('2026-09-06T09:00:00.000Z'),
    );
    closing.open(new Date('2026-09-06T09:00:00.000Z'));
    const paidDetail = voteDetail('paid-detail', paid.id);
    const unpaidDetail = voteDetail('unpaid-detail', unpaid.id);
    const closingDetail = voteDetail('closing-detail', closing.id);
    closingDetail.open(new Date('2026-09-06T09:00:00.000Z'));
    const repository = repositoryStub([unpaid], [paid], [closing]);
    const details = voteDetailRepositoryStub([
      paidDetail,
      unpaidDetail,
      closingDetail,
    ]);
    const entitlement: jest.Mocked<VoteUsageEntitlementAccessPort> = {
      hasPaidOrder: jest.fn(),
      findPaidVoteIds: jest.fn().mockResolvedValue(new Set([paid.id])),
    };
    const transactionManager: DatabaseTransactionManager = {
      runInTransaction: jest.fn(async (work) => work()),
    };
    const billingExpiration = billingExpirationStub([unpaid.id]);

    const result = await new ProcessDueVoteSchedulesHandler(
      repository,
      details,
      entitlement,
      billingExpiration,
      transactionManager,
    ).execute(ProcessDueVoteSchedulesCommand.of({ now, batchSize: 20 }));

    expect(result).toEqual({
      openedCount: 1,
      closedCount: 1,
      canceledCount: 1,
    });
    expect(paid.status).toBe('OPEN');
    expect(unpaid.status).toBe('CANCELED');
    expect(closing.status).toBe('CLOSED');
    expect(paidDetail.status).toBe('OPEN');
    expect(unpaidDetail.status).toBe('CANCELED');
    expect(closingDetail.status).toBe('CLOSED');
    expect(details.save.mock.calls.map(([detail]) => detail.id)).toEqual([
      unpaidDetail.id,
      paidDetail.id,
      closingDetail.id,
    ]);
    expect(repository.save.mock.calls.map(([vote]) => vote.id)).toEqual([
      unpaid.id,
      paid.id,
      closing.id,
    ]);
    expect(entitlement.findPaidVoteIds.mock.calls).toEqual([[[paid.id]]]);
    expect(entitlement.hasPaidOrder.mock.calls).toHaveLength(0);
    expect(billingExpiration.expirePendingOrders.mock.calls).toEqual([
      [
        {
          voteIds: [unpaid.id],
          expiredAt: now,
        },
      ],
    ]);
  });

  it('is idempotent when no schedule is due', async () => {
    const repository = repositoryStub([], [], []);
    const entitlement: jest.Mocked<VoteUsageEntitlementAccessPort> = {
      hasPaidOrder: jest.fn(),
      findPaidVoteIds: jest.fn().mockResolvedValue(new Set()),
    };

    const result = await new ProcessDueVoteSchedulesHandler(
      repository,
      voteDetailRepositoryStub(),
      entitlement,
      billingExpirationStub(),
      { runInTransaction: jest.fn(async (work) => work()) },
    ).execute(
      ProcessDueVoteSchedulesCommand.of({
        now: new Date('2026-09-06T10:00:00.000Z'),
        batchSize: 20,
      }),
    );

    expect(result).toEqual({
      openedCount: 0,
      closedCount: 0,
      canceledCount: 0,
    });
    expect(repository.save.mock.calls).toHaveLength(0);
  });
});

function billingLockedVote(id: string, startedAt: Date): VoteAggregate {
  const vote = VoteAggregate.create({
    id,
    createdByUserPrincipalId: 'user-1',
    commissionId: 'commission-1',
    title: id,
    votingChannels: [VotingChannel.Online],
    defaultPolicy: VotePolicy.of({
      privacyMode: PrivacyMode.Secret,
      participationUnit: ParticipationUnit.Individual,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Equal,
    }),
    identityVerificationPolicy: IdentityVerificationPolicy.of({
      required: false,
    }),
    startedAt,
    endedAt: new Date('2026-09-06T10:00:00.000Z'),
  });
  vote.lockForBilling(`order-${id}`);
  return vote;
}

function finalizedVote(id: string, startedAt: Date): VoteAggregate {
  const vote = billingLockedVote(id, startedAt);
  vote.finalizePaidBilling({
    billingOrderId: `order-${id}`,
    finalizedAt: new Date('2026-09-06T08:00:00.000Z'),
  });
  return vote;
}

function billingExpirationStub(
  expiredVoteIds: readonly string[] = [],
): jest.Mocked<UnpaidVoteBillingExpirationPort> {
  return {
    expirePendingOrders: jest.fn().mockResolvedValue(new Set(expiredVoteIds)),
  };
}

function voteDetail(id: string, voteId: string): VoteDetailAggregate {
  return VoteDetailAggregate.create({
    id,
    voteId,
    title: id,
    type: 'CANDIDATE',
    sortOrder: 0,
  });
}

function voteDetailRepositoryStub(
  details: VoteDetailAggregate[] = [],
): jest.Mocked<VoteDetailRepositoryPort> {
  return {
    nextId: jest.fn(),
    findById: jest.fn(),
    findByVoteIds: jest
      .fn()
      .mockImplementation((voteIds: readonly string[]) =>
        Promise.resolve(
          details.filter((detail) => voteIds.includes(detail.voteId)),
        ),
      ),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function repositoryStub(
  expiring: VoteAggregate[],
  opening: VoteAggregate[],
  closing: VoteAggregate[],
): jest.Mocked<VoteScheduleRepositoryPort> {
  return {
    findDueForPaymentExpiration: jest.fn().mockResolvedValue(expiring),
    findDueForOpening: jest.fn().mockResolvedValue(opening),
    findDueForClosing: jest.fn().mockResolvedValue(closing),
    save: jest.fn().mockResolvedValue(undefined),
  };
}
