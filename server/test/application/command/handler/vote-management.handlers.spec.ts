import { ChangeVoteStatusCommand } from '../../../../src/modules/vote/application/command/dto/request/change-vote-status.command';
import { UpdateCandidateCommand } from '../../../../src/modules/vote/application/command/dto/request/update-candidate.command';
import { UpdateVoteCommand } from '../../../../src/modules/vote/application/command/dto/request/update-vote.command';
import { ChangeVoteStatusHandler } from '../../../../src/modules/vote/application/command/handler/change-vote-status.handler';
import { UpdateCandidateHandler } from '../../../../src/modules/vote/application/command/handler/update-candidate.handler';
import { UpdateVoteHandler } from '../../../../src/modules/vote/application/command/handler/update-vote.handler';
import type { CandidateRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/candidate-repository.port';
import type { VoteDetailRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-detail-repository.port';
import type { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
import { CandidateAggregate } from '../../../../src/modules/vote/domain/candidate/candidate.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VoteStatus } from '../../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../src/shared/domain/voting/vo/vote-policy.vo';
import { VoteDetailAggregate } from '../../../../src/modules/vote/domain/vote/vote-detail.aggregate';
import { VoteAggregate } from '../../../../src/modules/vote/domain/vote/vote.aggregate';
import type {
  VoteSetupLifecyclePort,
  VoteUsageEntitlementAccessPort,
} from '../../../../src/shared/application/port/capability/vote-billing.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';

describe('vote management command handlers', () => {
  it('updates and opens a vote through the authoritative repository', async () => {
    const vote = createVote();
    const save = jest.fn();
    const repository = voteRepository(vote, save);
    const voteLifecycle = voteLifecycleStub();
    await new UpdateVoteHandler(
      repository,
      voteLifecycle,
      transactionManagerStub(),
    ).execute(
      UpdateVoteCommand.of({
        voteId: vote.id,
        title: 'Updated',
        votingChannels: [VotingChannel.Online],
        defaultPolicy: policyProps(),
        identityVerificationPolicy: { required: false },
      }),
    );
    vote.finalizeForBilling({
      billingOrderId: 'billing-order-1',
      finalizedAt: new Date(),
    });
    await new ChangeVoteStatusHandler(
      repository,
      entitlementStub(true),
      voteLifecycle,
      transactionManagerStub(),
    ).execute(
      ChangeVoteStatusCommand.of({
        voteId: vote.id,
        action: 'open',
        changedAt: new Date(),
      }),
    );
    expect(vote).toMatchObject({ title: 'Updated', status: VoteStatus.Open });
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('rejects opening without a paid billing entitlement', async () => {
    const vote = createVote();
    vote.finalizeForBilling({
      billingOrderId: 'billing-order-1',
      finalizedAt: new Date(),
    });

    await expect(
      new ChangeVoteStatusHandler(
        voteRepository(vote),
        entitlementStub(false),
        voteLifecycleStub(),
        transactionManagerStub(),
      ).execute(
        ChangeVoteStatusCommand.of({
          voteId: vote.id,
          action: 'open',
          changedAt: new Date(),
        }),
      ),
    ).rejects.toThrow('paid billing order is required');
  });

  it('rejects a candidate outside the requested parent scope', async () => {
    const vote = createVote();
    const detail = VoteDetailAggregate.create({
      id: 'detail-1',
      voteId: 'other-vote',
      title: 'Detail',
      type: 'CANDIDATE',
      sortOrder: 0,
    });
    const candidate = CandidateAggregate.create({
      id: 'candidate-1',
      voteDetailId: detail.id,
      candidateNo: 1,
      name: 'A',
    });
    const saveCandidate = jest.fn();
    const candidates: CandidateRepositoryPort = {
      nextId: jest.fn(),
      findById: jest.fn().mockResolvedValue(candidate),
      save: saveCandidate,
    };
    const details: VoteDetailRepositoryPort = {
      nextId: jest.fn(),
      findById: jest.fn().mockResolvedValue(detail),
      save: jest.fn(),
    };

    await expect(
      new UpdateCandidateHandler(
        voteRepository(vote),
        details,
        candidates,
      ).execute(
        UpdateCandidateCommand.of({
          voteId: vote.id,
          voteDetailId: detail.id,
          candidateId: candidate.id,
          candidateNo: 2,
          name: 'B',
        }),
      ),
    ).rejects.toThrow('resource does not belong');
    expect(saveCandidate).not.toHaveBeenCalled();
  });
});

function policyProps() {
  return {
    privacyMode: PrivacyMode.Secret,
    participationUnit: ParticipationUnit.Individual,
    resultStorageMode: ResultStorageMode.Database,
    voteWeightMode: VoteWeightMode.Equal,
  } as const;
}
function createVote() {
  return VoteAggregate.create({
    id: 'vote-1',
    commissionId: 'commission-1',
    title: 'Vote',
    votingChannels: [VotingChannel.Online],
    defaultPolicy: VotePolicy.of(policyProps()),
    identityVerificationPolicy: IdentityVerificationPolicy.of({
      required: false,
    }),
  });
}
function voteRepository(
  vote: VoteAggregate,
  save: jest.Mock = jest.fn(),
): jest.Mocked<VoteRepositoryPort> {
  return {
    nextId: jest.fn(),
    findById: jest.fn().mockResolvedValue(vote),
    save,
  };
}

function entitlementStub(paid: boolean): VoteUsageEntitlementAccessPort {
  return { hasPaidOrder: jest.fn().mockResolvedValue(paid) };
}

function transactionManagerStub(): DatabaseTransactionManager {
  return { runInTransaction: jest.fn(async (work) => work()) };
}

function voteLifecycleStub(): jest.Mocked<VoteSetupLifecyclePort> {
  return {
    lockVote: jest.fn().mockResolvedValue(undefined),
    finalizeForBilling: jest.fn().mockResolvedValue(undefined),
    cancelFinalizedVote: jest.fn().mockResolvedValue(undefined),
  };
}
