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
import type { AttachmentView } from './attachment.view';

export const ActiveBillingOrderStatus = {
  PendingPayment: 'PENDING_PAYMENT',
  Paid: 'PAID',
  RefundPending: 'REFUND_PENDING',
} as const;

type ActiveBillingOrderStatus =
  (typeof ActiveBillingOrderStatus)[keyof typeof ActiveBillingOrderStatus];

type VotePolicyViewProps = {
  readonly privacyMode: PrivacyMode;
  readonly participationUnit: ParticipationUnit;
  readonly resultStorageMode: ResultStorageMode;
  readonly voteWeightMode: VoteWeightMode;
};

export class VotePolicyView {
  private constructor(
    readonly privacyMode: PrivacyMode,
    readonly participationUnit: ParticipationUnit,
    readonly resultStorageMode: ResultStorageMode,
    readonly voteWeightMode: VoteWeightMode,
  ) {}

  static of(params: VotePolicyViewProps): VotePolicyView {
    return new VotePolicyView(
      params.privacyMode,
      params.participationUnit,
      params.resultStorageMode,
      params.voteWeightMode,
    );
  }
}

type VotePolicyOverridesViewProps = Partial<VotePolicyViewProps>;

export class VotePolicyOverridesView {
  readonly privacyMode?: PrivacyMode;
  readonly participationUnit?: ParticipationUnit;
  readonly resultStorageMode?: ResultStorageMode;
  readonly voteWeightMode?: VoteWeightMode;

  private constructor(params: VotePolicyOverridesViewProps) {
    if (params.privacyMode !== undefined) {
      this.privacyMode = params.privacyMode;
    }
    if (params.participationUnit !== undefined) {
      this.participationUnit = params.participationUnit;
    }
    if (params.resultStorageMode !== undefined) {
      this.resultStorageMode = params.resultStorageMode;
    }
    if (params.voteWeightMode !== undefined) {
      this.voteWeightMode = params.voteWeightMode;
    }
  }

  static of(params: VotePolicyOverridesViewProps): VotePolicyOverridesView {
    return new VotePolicyOverridesView(params);
  }
}

type IdentityVerificationPolicyViewProps = {
  readonly required: boolean;
  readonly provider?: string;
  readonly method?: string;
};

export class IdentityVerificationPolicyView {
  readonly provider?: string;
  readonly method?: string;

  private constructor(
    readonly required: boolean,
    provider: string | undefined,
    method: string | undefined,
  ) {
    if (provider !== undefined) {
      this.provider = provider;
    }
    if (method !== undefined) {
      this.method = method;
    }
  }

  static of(
    params: IdentityVerificationPolicyViewProps,
  ): IdentityVerificationPolicyView {
    return new IdentityVerificationPolicyView(
      params.required,
      params.provider,
      params.method,
    );
  }
}

type CandidateViewProps = {
  readonly id: string;
  readonly voteDetailId: string;
  readonly candidateNo: number;
  readonly name: string;
  readonly description: string;
  readonly status: CandidateStatus;
  readonly attachments?: readonly AttachmentView[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class CandidateView {
  private constructor(
    readonly id: string,
    readonly voteDetailId: string,
    readonly candidateNo: number,
    readonly name: string,
    readonly description: string,
    readonly status: CandidateStatus,
    readonly attachments: readonly AttachmentView[],
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static of(params: CandidateViewProps): CandidateView {
    return new CandidateView(
      params.id,
      params.voteDetailId,
      params.candidateNo,
      params.name,
      params.description,
      params.status,
      params.attachments ?? [],
      params.createdAt,
      params.updatedAt,
    );
  }
}

type VoteDetailViewProps = {
  readonly id: string;
  readonly voteId: string;
  readonly title: string;
  readonly description: string;
  readonly type: VoteDetailType;
  readonly overrides?: VotePolicyOverridesView;
  readonly sortOrder: number;
  readonly status: VoteDetailStatus;
  readonly attachments?: readonly AttachmentView[];
  readonly candidates: readonly CandidateView[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class VoteDetailView {
  readonly overrides?: VotePolicyOverridesView;

  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly title: string,
    readonly description: string,
    readonly type: VoteDetailType,
    overrides: VotePolicyOverridesView | undefined,
    readonly sortOrder: number,
    readonly status: VoteDetailStatus,
    readonly attachments: readonly AttachmentView[],
    readonly candidates: readonly CandidateView[],
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {
    if (overrides !== undefined) {
      this.overrides = overrides;
    }
  }

  static of(params: VoteDetailViewProps): VoteDetailView {
    return new VoteDetailView(
      params.id,
      params.voteId,
      params.title,
      params.description,
      params.type,
      params.overrides,
      params.sortOrder,
      params.status,
      params.attachments ?? [],
      params.candidates,
      params.createdAt,
      params.updatedAt,
    );
  }
}

type VoteSummaryViewProps = {
  readonly id: string;
  readonly commissionId: string;
  readonly title: string;
  readonly attachments?: readonly AttachmentView[];
  readonly votingChannels: readonly VotingChannel[];
  readonly defaultPolicy: VotePolicyView;
  readonly identityVerificationPolicy: IdentityVerificationPolicyView;
  readonly electoralRollSnapshotId?: string;
  readonly activeBillingOrderId?: string;
  readonly billingOrderStatus?: ActiveBillingOrderStatus;
  readonly status: VoteStatus;
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class VoteSummaryView {
  readonly electoralRollSnapshotId?: string;
  declare readonly activeBillingOrderId?: string;
  declare readonly billingOrderStatus?: ActiveBillingOrderStatus;

  private constructor(
    readonly id: string,
    readonly commissionId: string,
    readonly title: string,
    readonly attachments: readonly AttachmentView[],
    readonly votingChannels: readonly VotingChannel[],
    readonly defaultPolicy: VotePolicyView,
    readonly identityVerificationPolicy: IdentityVerificationPolicyView,
    electoralRollSnapshotId: string | undefined,
    activeBillingOrderId: string | undefined,
    billingOrderStatus: ActiveBillingOrderStatus | undefined,
    readonly status: VoteStatus,
    readonly startedAt: Date,
    readonly endedAt: Date,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {
    if (electoralRollSnapshotId !== undefined) {
      this.electoralRollSnapshotId = electoralRollSnapshotId;
    }
    if (activeBillingOrderId !== undefined) {
      this.activeBillingOrderId = activeBillingOrderId;
    }
    if (billingOrderStatus !== undefined) {
      this.billingOrderStatus = billingOrderStatus;
    }
  }

  static of(params: VoteSummaryViewProps): VoteSummaryView {
    return new VoteSummaryView(
      params.id,
      params.commissionId,
      params.title,
      params.attachments ?? [],
      params.votingChannels,
      params.defaultPolicy,
      params.identityVerificationPolicy,
      params.electoralRollSnapshotId,
      params.activeBillingOrderId,
      params.billingOrderStatus,
      params.status,
      params.startedAt,
      params.endedAt,
      params.createdAt,
      params.updatedAt,
    );
  }
}

type VoteViewProps = VoteSummaryViewProps & {
  readonly description: string;
  readonly voteDetails: readonly VoteDetailView[];
};

export class VoteView {
  readonly electoralRollSnapshotId?: string;
  declare readonly activeBillingOrderId?: string;
  declare readonly billingOrderStatus?: ActiveBillingOrderStatus;

  private constructor(
    readonly id: string,
    readonly commissionId: string,
    readonly title: string,
    readonly description: string,
    readonly attachments: readonly AttachmentView[],
    readonly votingChannels: readonly VotingChannel[],
    readonly defaultPolicy: VotePolicyView,
    readonly identityVerificationPolicy: IdentityVerificationPolicyView,
    electoralRollSnapshotId: string | undefined,
    activeBillingOrderId: string | undefined,
    billingOrderStatus: ActiveBillingOrderStatus | undefined,
    readonly status: VoteStatus,
    readonly voteDetails: readonly VoteDetailView[],
    readonly startedAt: Date,
    readonly endedAt: Date,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {
    if (electoralRollSnapshotId !== undefined) {
      this.electoralRollSnapshotId = electoralRollSnapshotId;
    }
    if (activeBillingOrderId !== undefined) {
      this.activeBillingOrderId = activeBillingOrderId;
    }
    if (billingOrderStatus !== undefined) {
      this.billingOrderStatus = billingOrderStatus;
    }
  }

  static of(params: VoteViewProps): VoteView {
    return new VoteView(
      params.id,
      params.commissionId,
      params.title,
      params.description,
      params.attachments ?? [],
      params.votingChannels,
      params.defaultPolicy,
      params.identityVerificationPolicy,
      params.electoralRollSnapshotId,
      params.activeBillingOrderId,
      params.billingOrderStatus,
      params.status,
      params.voteDetails,
      params.startedAt,
      params.endedAt,
      params.createdAt,
      params.updatedAt,
    );
  }
}

type VotePageViewProps = {
  readonly items: readonly VoteSummaryView[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
};

export class VotePageView {
  private constructor(
    readonly items: readonly VoteSummaryView[],
    readonly page: number,
    readonly pageSize: number,
    readonly totalItems: number,
    readonly totalPages: number,
  ) {}

  static of(params: VotePageViewProps): VotePageView {
    return new VotePageView(
      params.items,
      params.page,
      params.pageSize,
      params.totalItems,
      params.totalPages,
    );
  }
}
