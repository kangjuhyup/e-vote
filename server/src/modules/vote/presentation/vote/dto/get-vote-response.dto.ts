import { ApiProperty } from '@nestjs/swagger';

const PrivacyModeResponse = {
  Secret: 'SECRET',
  Public: 'PUBLIC',
} as const;

const ParticipationUnitResponse = {
  Individual: 'INDIVIDUAL',
  Group: 'GROUP',
} as const;

const ResultStorageModeResponse = {
  Database: 'DATABASE',
  Blockchain: 'BLOCKCHAIN',
} as const;

const VoteWeightModeResponse = {
  Equal: 'EQUAL',
  Share: 'SHARE',
} as const;

const VotingChannelResponse = {
  Online: 'ONLINE',
  Onsite: 'ONSITE',
  Visit: 'VISIT',
} as const;

const VoteStatusResponse = {
  Draft: 'DRAFT',
  Open: 'OPEN',
  Closed: 'CLOSED',
  Canceled: 'CANCELED',
} as const;

const VoteDetailTypeResponse = {
  Candidate: 'CANDIDATE',
  YesNo: 'YES_NO',
} as const;

const CandidateStatusResponse = {
  Active: 'ACTIVE',
  Withdrawn: 'WITHDRAWN',
} as const;

type VotePolicySource = {
  readonly privacyMode: string;
  readonly participationUnit: string;
  readonly resultStorageMode: string;
  readonly voteWeightMode: string;
};

type VotePolicyOverridesSource = Partial<VotePolicySource>;

type IdentityVerificationPolicySource = {
  readonly required: boolean;
  readonly provider?: string;
  readonly method?: string;
};

type VoteSummarySource = {
  readonly id: string;
  readonly commissionId: string;
  readonly title: string;
  readonly votingChannels: readonly string[];
  readonly defaultPolicy: VotePolicySource;
  readonly identityVerificationPolicy: IdentityVerificationPolicySource;
  readonly electoralRollSnapshotId?: string;
  readonly status: string;
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

type CandidateSource = {
  readonly id: string;
  readonly voteDetailId: string;
  readonly candidateNo: number;
  readonly name: string;
  readonly description: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

type VoteDetailSource = {
  readonly id: string;
  readonly voteId: string;
  readonly title: string;
  readonly description: string;
  readonly type: string;
  readonly overrides?: VotePolicyOverridesSource;
  readonly sortOrder: number;
  readonly status: string;
  readonly candidates: readonly CandidateSource[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

type VoteSource = VoteSummarySource & {
  readonly description: string;
  readonly voteDetails: readonly VoteDetailSource[];
};

export class VotePolicyResponse {
  @ApiProperty({
    enum: Object.values(PrivacyModeResponse),
    example: PrivacyModeResponse.Secret,
    description: '투표 공개 여부 정책입니다.',
  })
  readonly privacyMode: string;

  @ApiProperty({
    enum: Object.values(ParticipationUnitResponse),
    example: ParticipationUnitResponse.Individual,
    description: '개인별 또는 그룹별 참여 단위입니다.',
  })
  readonly participationUnit: string;

  @ApiProperty({
    enum: Object.values(ResultStorageModeResponse),
    example: ResultStorageModeResponse.Database,
    description: '결과 저장 대상입니다.',
  })
  readonly resultStorageMode: string;

  @ApiProperty({
    enum: Object.values(VoteWeightModeResponse),
    example: VoteWeightModeResponse.Equal,
    description: '동일 가중치 또는 지분 가중치 투표 방식입니다.',
  })
  readonly voteWeightMode: string;

  private constructor(
    privacyMode: string,
    participationUnit: string,
    resultStorageMode: string,
    voteWeightMode: string,
  ) {
    this.privacyMode = privacyMode;
    this.participationUnit = participationUnit;
    this.resultStorageMode = resultStorageMode;
    this.voteWeightMode = voteWeightMode;
  }

  static of(source: VotePolicySource): VotePolicyResponse {
    return new VotePolicyResponse(
      source.privacyMode,
      source.participationUnit,
      source.resultStorageMode,
      source.voteWeightMode,
    );
  }
}

export class VotePolicyOverridesResponse {
  @ApiProperty({
    required: false,
    enum: Object.values(PrivacyModeResponse),
    example: PrivacyModeResponse.Public,
    description: '부모 정책을 덮어쓴 공개 여부 정책입니다.',
  })
  readonly privacyMode?: string;

  @ApiProperty({
    required: false,
    enum: Object.values(ParticipationUnitResponse),
    example: ParticipationUnitResponse.Group,
    description: '부모 정책을 덮어쓴 참여 단위입니다.',
  })
  readonly participationUnit?: string;

  @ApiProperty({
    required: false,
    enum: Object.values(ResultStorageModeResponse),
    example: ResultStorageModeResponse.Database,
    description: '부모 정책을 덮어쓴 결과 저장 대상입니다.',
  })
  readonly resultStorageMode?: string;

  @ApiProperty({
    required: false,
    enum: Object.values(VoteWeightModeResponse),
    example: VoteWeightModeResponse.Share,
    description: '부모 정책을 덮어쓴 가중치 방식입니다.',
  })
  readonly voteWeightMode?: string;

  private constructor(source: VotePolicyOverridesSource) {
    if (source.privacyMode !== undefined) {
      this.privacyMode = source.privacyMode;
    }
    if (source.participationUnit !== undefined) {
      this.participationUnit = source.participationUnit;
    }
    if (source.resultStorageMode !== undefined) {
      this.resultStorageMode = source.resultStorageMode;
    }
    if (source.voteWeightMode !== undefined) {
      this.voteWeightMode = source.voteWeightMode;
    }
  }

  static of(source: VotePolicyOverridesSource): VotePolicyOverridesResponse {
    return new VotePolicyOverridesResponse(source);
  }
}

export class IdentityVerificationPolicyResponse {
  @ApiProperty({
    example: false,
    description: '본인인증 요구 여부입니다.',
  })
  readonly required: boolean;

  @ApiProperty({
    required: false,
    example: 'PASS',
    description: '본인인증 제공자입니다.',
  })
  readonly provider?: string;

  @ApiProperty({
    required: false,
    example: 'MOBILE',
    description: '본인인증 방식입니다.',
  })
  readonly method?: string;

  private constructor(
    required: boolean,
    provider: string | undefined,
    method: string | undefined,
  ) {
    this.required = required;
    if (provider !== undefined) {
      this.provider = provider;
    }
    if (method !== undefined) {
      this.method = method;
    }
  }

  static of(
    source: IdentityVerificationPolicySource,
  ): IdentityVerificationPolicyResponse {
    return new IdentityVerificationPolicyResponse(
      source.required,
      source.provider,
      source.method,
    );
  }
}

export class VoteSummaryResponse {
  @ApiProperty({
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'commission-1',
    description: '투표를 주관하는 선거관리위원회 ID입니다.',
  })
  readonly commissionId: string;

  @ApiProperty({
    required: false,
    example: 'snapshot-1',
    description: '투표에 고정된 선거인명부 스냅샷 ID입니다.',
  })
  readonly electoralRollSnapshotId?: string;

  @ApiProperty({
    example: 'Board election',
    description: '부모 투표 제목입니다.',
  })
  readonly title: string;

  @ApiProperty({
    enum: Object.values(VotingChannelResponse),
    isArray: true,
    example: [VotingChannelResponse.Online],
    description: '부모 투표 단위로 허용하는 투표 채널입니다.',
  })
  readonly votingChannels: readonly string[];

  @ApiProperty({
    type: () => VotePolicyResponse,
    description: '부모 투표의 기본 정책입니다.',
  })
  readonly defaultPolicy: VotePolicyResponse;

  @ApiProperty({
    type: () => IdentityVerificationPolicyResponse,
    description: '부모 투표의 본인인증 정책입니다.',
  })
  readonly identityVerificationPolicy: IdentityVerificationPolicyResponse;

  @ApiProperty({
    enum: Object.values(VoteStatusResponse),
    example: VoteStatusResponse.Draft,
    description: '부모 투표 상태입니다.',
  })
  readonly status: string;

  @ApiProperty({
    example: '2026-08-13T00:00:00.000Z',
    format: 'date-time',
    description: '투표 시작 시각입니다.',
  })
  readonly startedAt: string;

  @ApiProperty({
    example: '2026-08-14T00:00:00.000Z',
    format: 'date-time',
    description: '투표 종료 시각입니다.',
  })
  readonly endedAt: string;

  @ApiProperty({
    example: '2026-08-12T00:00:00.000Z',
    format: 'date-time',
    description: '생성 시각입니다.',
  })
  readonly createdAt: string;

  @ApiProperty({
    example: '2026-08-12T01:00:00.000Z',
    format: 'date-time',
    description: '수정 시각입니다.',
  })
  readonly updatedAt: string;

  protected constructor(source: VoteSummarySource) {
    this.id = source.id;
    this.commissionId = source.commissionId;
    if (source.electoralRollSnapshotId !== undefined) {
      this.electoralRollSnapshotId = source.electoralRollSnapshotId;
    }
    this.title = source.title;
    this.votingChannels = source.votingChannels;
    this.defaultPolicy = VotePolicyResponse.of(source.defaultPolicy);
    this.identityVerificationPolicy = IdentityVerificationPolicyResponse.of(
      source.identityVerificationPolicy,
    );
    this.status = source.status;
    this.startedAt = source.startedAt.toISOString();
    this.endedAt = source.endedAt.toISOString();
    this.createdAt = source.createdAt.toISOString();
    this.updatedAt = source.updatedAt.toISOString();
  }

  static of(source: VoteSummarySource): VoteSummaryResponse {
    return new VoteSummaryResponse(source);
  }
}

class CandidateResponse {
  @ApiProperty({
    example: 'candidate-1',
    description: '후보 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'vote-detail-1',
    description: '후보가 속한 자식 투표 ID입니다.',
  })
  readonly voteDetailId: string;

  @ApiProperty({
    example: 1,
    description: '후보 번호입니다.',
  })
  readonly candidateNo: number;

  @ApiProperty({
    example: 'Kim',
    description: '후보 이름입니다.',
  })
  readonly name: string;

  @ApiProperty({
    example: '',
    description: '후보 설명입니다.',
  })
  readonly description: string;

  @ApiProperty({
    enum: Object.values(CandidateStatusResponse),
    example: CandidateStatusResponse.Active,
    description: '후보 상태입니다.',
  })
  readonly status: string;

  @ApiProperty({
    example: '2026-08-12T00:00:00.000Z',
    format: 'date-time',
    description: '생성 시각입니다.',
  })
  readonly createdAt: string;

  @ApiProperty({
    example: '2026-08-12T01:00:00.000Z',
    format: 'date-time',
    description: '수정 시각입니다.',
  })
  readonly updatedAt: string;

  private constructor(source: CandidateSource) {
    this.id = source.id;
    this.voteDetailId = source.voteDetailId;
    this.candidateNo = source.candidateNo;
    this.name = source.name;
    this.description = source.description;
    this.status = source.status;
    this.createdAt = source.createdAt.toISOString();
    this.updatedAt = source.updatedAt.toISOString();
  }

  static of(source: CandidateSource): CandidateResponse {
    return new CandidateResponse(source);
  }
}

class VoteDetailResponse {
  @ApiProperty({
    example: 'vote-detail-1',
    description: '자식 투표 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  readonly voteId: string;

  @ApiProperty({
    example: 'President',
    description: '자식 투표 제목입니다.',
  })
  readonly title: string;

  @ApiProperty({
    example: '',
    description: '자식 투표 설명입니다.',
  })
  readonly description: string;

  @ApiProperty({
    enum: Object.values(VoteDetailTypeResponse),
    example: VoteDetailTypeResponse.Candidate,
    description: '자식 투표 유형입니다.',
  })
  readonly type: string;

  @ApiProperty({
    required: false,
    type: () => VotePolicyOverridesResponse,
    description: '부모 투표 기본 정책을 덮어쓴 자식 투표 정책입니다.',
  })
  readonly overrides?: VotePolicyOverridesResponse;

  @ApiProperty({
    example: 0,
    description: '자식 투표 정렬 순서입니다.',
  })
  readonly sortOrder: number;

  @ApiProperty({
    enum: Object.values(VoteStatusResponse),
    example: VoteStatusResponse.Draft,
    description: '자식 투표 상태입니다.',
  })
  readonly status: string;

  @ApiProperty({
    type: () => [CandidateResponse],
    description: '자식 투표에 등록된 후보 목록입니다.',
  })
  readonly candidates: readonly CandidateResponse[];

  @ApiProperty({
    example: '2026-08-12T00:00:00.000Z',
    format: 'date-time',
    description: '생성 시각입니다.',
  })
  readonly createdAt: string;

  @ApiProperty({
    example: '2026-08-12T01:00:00.000Z',
    format: 'date-time',
    description: '수정 시각입니다.',
  })
  readonly updatedAt: string;

  private constructor(source: VoteDetailSource) {
    this.id = source.id;
    this.voteId = source.voteId;
    this.title = source.title;
    this.description = source.description;
    this.type = source.type;
    if (source.overrides !== undefined) {
      this.overrides = VotePolicyOverridesResponse.of(source.overrides);
    }
    this.sortOrder = source.sortOrder;
    this.status = source.status;
    this.candidates = source.candidates.map((candidate) =>
      CandidateResponse.of(candidate),
    );
    this.createdAt = source.createdAt.toISOString();
    this.updatedAt = source.updatedAt.toISOString();
  }

  static of(source: VoteDetailSource): VoteDetailResponse {
    return new VoteDetailResponse(source);
  }
}

export class GetVoteResponse extends VoteSummaryResponse {
  @ApiProperty({
    example: 'Annual board election',
    description: '부모 투표 설명입니다.',
  })
  readonly description: string;

  @ApiProperty({
    type: () => [VoteDetailResponse],
    description: '부모 투표에 속한 자식 투표 목록입니다.',
  })
  readonly voteDetails: readonly VoteDetailResponse[];

  private constructor(source: VoteSource) {
    super(source);
    this.description = source.description;
    this.voteDetails = source.voteDetails.map((voteDetail) =>
      VoteDetailResponse.of(voteDetail),
    );
  }

  static of(source: VoteSource): GetVoteResponse {
    return new GetVoteResponse(source);
  }
}
