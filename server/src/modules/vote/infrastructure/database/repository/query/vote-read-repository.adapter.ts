import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  VoteDetailRequest,
  VotePageRequest,
  VoteReadRepositoryPort,
} from '../../../../application/port/persistence/query/vote-read-repository.port';
import {
  ActiveBillingOrderStatus,
  CandidateView,
  IdentityVerificationPolicyView,
  VoteDetailView,
  VotePageView,
  VotePolicyOverridesView,
  VotePolicyView,
  VoteSummaryView,
  VoteView,
} from '../../../../application/query/dto/response/vote.view';
import type { CandidateStatus } from '../../../../../../shared/domain/voting/type/candidate-status.type';
import type { VoteDetailType } from '../../../../../../shared/domain/voting/type/vote-detail.type';
import type {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../../../shared/domain/voting/type/vote-policy.type';
import type {
  VoteDetailStatus,
  VoteStatus,
} from '../../../../../../shared/domain/voting/type/vote-status.type';
import type { VotingChannel } from '../../../../../../shared/domain/voting/type/voting-channel.type';
import {
  SELECT_IN_RELATION_LOAD_OPTIONS,
  getDatabaseEntities,
  loadedItems,
  type LoadedCollectionLike,
} from '../../../../../../platform/database/repository/database-repository.util';

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
  readonly billingOrderId: string | null;
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

type ActiveBillingOrderReadPersistence = {
  readonly id: string;
  readonly status: (typeof ActiveBillingOrderStatus)[keyof typeof ActiveBillingOrderStatus];
};

@Injectable()
export class VoteReadRepositoryAdapter implements VoteReadRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async findDetailById(
    request: VoteDetailRequest,
  ): Promise<VoteView | undefined> {
    const { VoteEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      VoteEntity as any,
      { id: request.voteId },
      {
        populate: VOTE_DETAIL_READ_RELATIONS,
        ...SELECT_IN_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as VoteReadPersistence | null;

    if (!entity) return undefined;
    const billingOrders = await this.findOwnedActiveBillingOrders(
      [entity],
      request.userPrincipalId,
    );

    return this.toVoteView(entity, billingOrders.get(entity.id));
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
        ...SELECT_IN_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as [VoteSummaryReadPersistence[], number];

    const billingOrders = await this.findOwnedActiveBillingOrders(
      entities,
      request.userPrincipalId,
    );

    return VotePageView.of({
      items: entities.map((entity) =>
        this.toVoteSummaryView(entity, billingOrders.get(entity.id)),
      ),
      page: request.page,
      pageSize: request.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / request.pageSize),
    });
  }

  private toVoteView(
    entity: VoteReadPersistence,
    billingOrder: ActiveBillingOrderReadPersistence | undefined,
  ): VoteView {
    return VoteView.of({
      ...this.toVoteSummaryView(entity, billingOrder),
      description: entity.description,
      voteDetails: loadedItems(entity.voteDetails)
        .map((voteDetail) => this.toVoteDetailView(entity.id, voteDetail))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    });
  }

  private toVoteSummaryView(
    entity: VoteSummaryReadPersistence,
    billingOrder: ActiveBillingOrderReadPersistence | undefined,
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
      activeBillingOrderId: billingOrder?.id,
      billingOrderStatus: billingOrder?.status,
      status: entity.status,
      startedAt: entity.startedAt,
      endedAt: entity.endedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private async findOwnedActiveBillingOrders(
    votes: readonly VoteSummaryReadPersistence[],
    userPrincipalId: string,
  ): Promise<ReadonlyMap<string, ActiveBillingOrderReadPersistence>> {
    const voteIdsByBillingOrderId = new Map<string, string>();
    for (const vote of votes) {
      if (vote.billingOrderId) {
        voteIdsByBillingOrderId.set(vote.billingOrderId, vote.id);
      }
    }
    const billingOrderIds = [...voteIdsByBillingOrderId.keys()];
    if (billingOrderIds.length === 0) return new Map();

    const { BillingOrderEntity } = await getDatabaseEntities();
    const orders = (await this.em.find(
      BillingOrderEntity as any,
      {
        id: { $in: billingOrderIds },
        orderedByUserPrincipalId: userPrincipalId,
        status: {
          $in: [
            ActiveBillingOrderStatus.PendingPayment,
            ActiveBillingOrderStatus.Paid,
            ActiveBillingOrderStatus.RefundPending,
          ],
        },
      },
      { fields: ['id', 'status'] } as any,
    )) as unknown as ActiveBillingOrderReadPersistence[];

    return new Map(
      orders.flatMap((order) => {
        const voteId = voteIdsByBillingOrderId.get(order.id);
        return voteId ? [[voteId, order] as const] : [];
      }),
    );
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
