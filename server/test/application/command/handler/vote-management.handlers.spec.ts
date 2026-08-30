import { ChangeVoteStatusCommand } from '../../../../src/application/command/dto/request/change-vote-status.command';
import { UpdateCandidateCommand } from '../../../../src/application/command/dto/request/update-candidate.command';
import { UpdateVoteCommand } from '../../../../src/application/command/dto/request/update-vote.command';
import { ChangeVoteStatusHandler } from '../../../../src/application/command/handler/change-vote-status.handler';
import { UpdateCandidateHandler } from '../../../../src/application/command/handler/update-candidate.handler';
import { UpdateVoteHandler } from '../../../../src/application/command/handler/update-vote.handler';
import type { CandidateRepositoryPort } from '../../../../src/application/port/persistence/command/candidate-repository.port';
import type { VoteDetailRepositoryPort } from '../../../../src/application/port/persistence/command/vote-detail-repository.port';
import type { VoteRepositoryPort } from '../../../../src/application/port/persistence/command/vote-repository.port';
import { CandidateAggregate } from '../../../../src/domain/candidate/candidate.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/domain/vote/type/vote-policy.type';
import { VoteStatus } from '../../../../src/domain/vote/type/vote-status.type';
import { VotingChannel } from '../../../../src/domain/vote/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../../src/domain/vote/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../src/domain/vote/vo/vote-policy.vo';
import { VoteDetailAggregate } from '../../../../src/domain/vote/vote-detail.aggregate';
import { VoteAggregate } from '../../../../src/domain/vote/vote.aggregate';

describe('vote management command handlers', () => {
  it('updates and opens a vote through the authoritative repository', async () => {
    const vote = createVote();
    const save = jest.fn();
    const repository = voteRepository(vote, save);
    await new UpdateVoteHandler(repository).execute(
      UpdateVoteCommand.of({
        voteId: vote.id,
        title: 'Updated',
        votingChannels: [VotingChannel.Online],
        defaultPolicy: policyProps(),
        identityVerificationPolicy: { required: false },
      }),
    );
    await new ChangeVoteStatusHandler(repository).execute(
      ChangeVoteStatusCommand.of({
        voteId: vote.id,
        action: 'open',
        changedAt: new Date(),
      }),
    );
    expect(vote).toMatchObject({ title: 'Updated', status: VoteStatus.Open });
    expect(save).toHaveBeenCalledTimes(2);
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
