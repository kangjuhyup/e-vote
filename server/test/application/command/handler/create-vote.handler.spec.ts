import { CreateVoteCommand } from '../../../../src/modules/vote/application/command/dto/request/create-vote.command';
import { CreateVoteHandler } from '../../../../src/modules/vote/application/command/handler/create-vote.handler';
import { ElectionCommissionRepositoryPort } from '../../../../src/modules/election-commission/application/port/persistence/command/election-commission-repository.port';
import { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
import { ElectionCommissionAggregate } from '../../../../src/modules/election-commission/domain/election-commission.aggregate';
import { VoteAggregate } from '../../../../src/modules/vote/domain/vote/vote.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VoteStatus } from '../../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { UserPrincipal } from '../../../../src/shared/application/security/user-principal';

describe('CreateVoteHandler', () => {
  it('creates a draft vote and saves it through the repository', async () => {
    const save = jest
      .fn<Promise<void>, [VoteAggregate]>()
      .mockResolvedValue(undefined);
    const repository: VoteRepositoryPort = {
      nextId: jest.fn().mockReturnValue('vote-1'),
      findById: jest.fn().mockResolvedValue(undefined),
      save,
    };
    const commissionRepository: ElectionCommissionRepositoryPort = {
      softDelete: jest.fn(),
      nextId: jest.fn().mockReturnValue('commission-unused'),
      findById: jest.fn().mockResolvedValue(
        ElectionCommissionAggregate.create({
          id: 'commission-1',
          name: 'Main Commission',
          createdAt: new Date('2026-08-13T00:00:00.000Z'),
        }),
      ),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const handler = new CreateVoteHandler(repository, commissionRepository);

    const result = await handler.execute(
      CreateVoteCommand.of({
        createdByUserPrincipalId: 'user-1',
        tenantId: 'tenant-1',
        organizationGroupId: 'organization-1',
        organizationGroupCode: 'ORG-001',
        commissionId: 'commission-1',
        title: 'Board election',
        votingChannels: [VotingChannel.Online, VotingChannel.Onsite],
        defaultPolicy: {
          privacyMode: PrivacyMode.Secret,
          participationUnit: ParticipationUnit.Individual,
          resultStorageMode: ResultStorageMode.Database,
          voteWeightMode: VoteWeightMode.Equal,
        },
        identityVerificationPolicy: {
          required: false,
        },
        startedAt: new Date('2026-09-06T10:00:00.000Z'),
        endedAt: new Date('2026-09-06T11:00:00.000Z'),
      }),
      UserPrincipal.of({
        id: 'user-1',
        tenantId: 'tenant-1',
        groups: [
          { id: 'organization-1', code: 'ORG-001', roles: [] },
          {
            id: 'managers-1',
            code: 'ORG-001.vote-managers',
            parentId: 'organization-1',
            roles: [{ id: 'role-1', code: 'vote-manager' }],
          },
        ],
      }),
    );

    expect(result).toEqual({
      id: 'vote-1',
      commissionId: 'commission-1',
      status: VoteStatus.Draft,
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBeInstanceOf(VoteAggregate);
    expect(save.mock.calls[0][0]).toMatchObject({
      id: 'vote-1',
      commissionId: 'commission-1',
      createdByUserPrincipalId: 'user-1',
      tenantId: 'tenant-1',
      organizationGroupId: 'organization-1',
      organizationGroupCode: 'ORG-001',
      title: 'Board election',
      votingChannels: [VotingChannel.Online, VotingChannel.Onsite],
      startedAt: new Date('2026-09-06T10:00:00.000Z'),
      endedAt: new Date('2026-09-06T11:00:00.000Z'),
      status: VoteStatus.Draft,
    });
  });
});
