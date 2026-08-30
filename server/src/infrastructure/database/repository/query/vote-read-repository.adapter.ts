import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  VotePageRequest,
  VoteReadRepositoryPort,
} from '../../../../application/port/persistence/query/vote-read-repository.port';
import {
  CandidateView,
  IdentityVerificationPolicyView,
  VoteDetailView,
  VotePageView,
  VotePolicyOverridesView,
  VotePolicyView,
  VoteSummaryView,
  VoteView,
} from '../../../../application/query/view/vote.view';
import type { CandidateStatus } from '../../../../domain/candidate/type/candidate-status.type';
import type { VoteDetailType } from '../../../../domain/vote/type/vote-detail.type';
import type {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../domain/vote/type/vote-policy.type';
import type {
  VoteDetailStatus,
  VoteStatus,
} from '../../../../domain/vote/type/vote-status.type';
import type { VotingChannel } from '../../../../domain/vote/type/voting-channel.type';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  getDatabaseEntities,
  loadedItems,
  type LoadedCollectionLike,
} from '../database-repository.util';

const VOTE_DETAIL_READ_RELATIONS = [
  'commission',
  'electoralRollSnapshot',
  'votingChannels',
  'voteDetails.candidates',
] as const;
const VOTE_PAGE_READ_RELATIONS = [
  'commission',
  'electoralRollSnapshot',
  'votingChannels',
] as const;

type VoteReadPersistence = {
  readonly id: string;
  readonly commission: { readonly id: string };
  readonly electoralRollSnapshot: { readonly id: string } | null;
  readonly title: string;
  readonly description: string;
  readonly votingChannels: LoadedCollectionLike<{
    readonly channel: VotingChannel;
  }>;
  readonly defaultPrivacyMode: PrivacyMode;
  readonly defaultParticipationUnit: ParticipationUnit;
  readonly defaultResultStorageMode: ResultStorageMode;
  readonly defaultVoteWeightMode: VoteWeightMode;
  readonly identityVerificationRequired: boolean;
  readonly identityVerificationProvider: string | null;
  readonly identityVerificationMethod: string | null;
  readonly status: VoteStatus;
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly voteDetails: LoadedCollectionLike<VoteDetailReadPersistence>;
};

type VoteSummaryReadPersistence = Omit<VoteReadPersistence, 'voteDetails'>;

type VoteDetailReadPersistence = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly type: VoteDetailType;
  readonly privacyModeOverride: PrivacyMode | null;
  readonly participationUnitOverride: ParticipationUnit | null;
  readonly resultStorageModeOverride: ResultStorageMode | null;
  readonly voteWeightModeOverride: VoteWeightMode | null;
  readonly sortOrder: number;
  readonly status: VoteDetailStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly candidates: LoadedCollectionLike<CandidateReadPersistence>;
};

type CandidateReadPersistence = {
  readonly id: string;
  readonly candidateNo: number;
  readonly name: string;
  readonly description: string;
  readonly status: CandidateStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

@Injectable()
export class VoteReadRepositoryAdapter implements VoteReadRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async findDetailById(voteId: string): Promise<VoteView | undefined> {
    const { VoteEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(VoteEntity as any, { id: voteId }, {
      populate: VOTE_DETAIL_READ_RELATIONS,
      ...JOINED_RELATION_LOAD_OPTIONS,
    } as any)) as unknown as VoteReadPersistence | null;

    return entity ? this.toVoteView(entity) : undefined;
  }

  async findPage(request: VotePageRequest): Promise<VotePageView> {
    const { VoteEntity } = await getDatabaseEntities();
    const [entities, totalItems] = (await this.em.findAndCount(
      VoteEntity as any,
      {},
      {
        populate: VOTE_PAGE_READ_RELATIONS,
        limit: request.pageSize,
        offset: (request.page - 1) * request.pageSize,
        orderBy: {
          createdAt: 'desc',
          id: 'desc',
        },
        ...JOINED_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as [VoteSummaryReadPersistence[], number];

    return VotePageView.of({
      items: entities.map((entity) => this.toVoteSummaryView(entity)),
      page: request.page,
      pageSize: request.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / request.pageSize),
    });
  }

  private toVoteView(entity: VoteReadPersistence): VoteView {
    return VoteView.of({
      ...this.toVoteSummaryView(entity),
      description: entity.description,
      voteDetails: loadedItems(entity.voteDetails)
        .map((voteDetail) => this.toVoteDetailView(entity.id, voteDetail))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    });
  }

  private toVoteSummaryView(
    entity: VoteSummaryReadPersistence,
  ): VoteSummaryView {
    return VoteSummaryView.of({
      id: entity.id,
      commissionId: entity.commission.id,
      title: entity.title,
      votingChannels: loadedItems(entity.votingChannels).map(
        (votingChannel) => votingChannel.channel,
      ),
      defaultPolicy: VotePolicyView.of({
        privacyMode: entity.defaultPrivacyMode,
        participationUnit: entity.defaultParticipationUnit,
        resultStorageMode: entity.defaultResultStorageMode,
        voteWeightMode: entity.defaultVoteWeightMode,
      }),
      identityVerificationPolicy: IdentityVerificationPolicyView.of({
        required: entity.identityVerificationRequired,
        provider: entity.identityVerificationProvider ?? undefined,
        method: entity.identityVerificationMethod ?? undefined,
      }),
      electoralRollSnapshotId: entity.electoralRollSnapshot?.id,
      status: entity.status,
      startedAt: entity.startedAt,
      endedAt: entity.endedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toVoteDetailView(
    voteId: string,
    entity: VoteDetailReadPersistence,
  ): VoteDetailView {
    return VoteDetailView.of({
      id: entity.id,
      voteId,
      title: entity.title,
      description: entity.description,
      type: entity.type,
      overrides: this.toOverridesView(entity),
      sortOrder: entity.sortOrder,
      status: entity.status,
      candidates: loadedItems(entity.candidates)
        .map((candidate) => this.toCandidateView(entity.id, candidate))
        .sort((a, b) => a.candidateNo - b.candidateNo),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toCandidateView(
    voteDetailId: string,
    entity: CandidateReadPersistence,
  ): CandidateView {
    return CandidateView.of({
      id: entity.id,
      voteDetailId,
      candidateNo: entity.candidateNo,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toOverridesView(
    entity: VoteDetailReadPersistence,
  ): VotePolicyOverridesView | undefined {
    const overrides = {
      privacyMode: entity.privacyModeOverride ?? undefined,
      participationUnit: entity.participationUnitOverride ?? undefined,
      resultStorageMode: entity.resultStorageModeOverride ?? undefined,
      voteWeightMode: entity.voteWeightModeOverride ?? undefined,
    };

    return Object.values(overrides).some((value) => value !== undefined)
      ? VotePolicyOverridesView.of(overrides)
      : undefined;
  }
}
