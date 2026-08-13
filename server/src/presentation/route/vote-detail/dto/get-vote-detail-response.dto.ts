import { ApiProperty } from '@nestjs/swagger';
import { VotePolicyOverridesResponse } from '../../vote/dto/get-vote-response.dto';

const VoteDetailTypeResponse = {
  Candidate: 'CANDIDATE',
  YesNo: 'YES_NO',
} as const;

const VoteDetailStatusResponse = {
  Draft: 'DRAFT',
  Open: 'OPEN',
  Closed: 'CLOSED',
  Canceled: 'CANCELED',
} as const;

type VoteDetailPolicyOverridesSource = {
  readonly privacyMode?: string;
  readonly participationUnit?: string;
  readonly resultStorageMode?: string;
  readonly voteWeightMode?: string;
};

type VoteDetailSource = {
  readonly id: string;
  readonly voteId: string;
  readonly title: string;
  readonly description: string;
  readonly type: string;
  readonly overrides?: VoteDetailPolicyOverridesSource;
  readonly sortOrder: number;
  readonly status: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class GetVoteDetailResponse {
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
    enum: Object.values(VoteDetailStatusResponse),
    example: VoteDetailStatusResponse.Draft,
    description: '자식 투표 상태입니다.',
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
    this.createdAt = source.createdAt.toISOString();
    this.updatedAt = source.updatedAt.toISOString();
  }

  static of(source: VoteDetailSource): GetVoteDetailResponse {
    return new GetVoteDetailResponse(source);
  }
}
