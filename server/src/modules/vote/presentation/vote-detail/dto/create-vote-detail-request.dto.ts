import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

const VoteDetailTypeBody = {
  Candidate: 'CANDIDATE',
  YesNo: 'YES_NO',
} as const;

type VoteDetailTypeBody =
  (typeof VoteDetailTypeBody)[keyof typeof VoteDetailTypeBody];

const PrivacyModeBody = {
  Secret: 'SECRET',
  Public: 'PUBLIC',
} as const;

type PrivacyModeBody = (typeof PrivacyModeBody)[keyof typeof PrivacyModeBody];

const ParticipationUnitBody = {
  Individual: 'INDIVIDUAL',
  Group: 'GROUP',
} as const;

type ParticipationUnitBody =
  (typeof ParticipationUnitBody)[keyof typeof ParticipationUnitBody];

const ResultStorageModeBody = {
  Database: 'DATABASE',
  Blockchain: 'BLOCKCHAIN',
} as const;

type ResultStorageModeBody =
  (typeof ResultStorageModeBody)[keyof typeof ResultStorageModeBody];

const VoteWeightModeBody = {
  Equal: 'EQUAL',
  Share: 'SHARE',
} as const;

type VoteWeightModeBody =
  (typeof VoteWeightModeBody)[keyof typeof VoteWeightModeBody];

class VotePolicyOverridesBody {
  @ApiProperty({
    required: false,
    enum: Object.values(PrivacyModeBody),
    example: PrivacyModeBody.Public,
    description: '부모 정책을 덮어쓸 공개 여부 정책입니다.',
  })
  readonly privacyMode?: PrivacyModeBody;

  @ApiProperty({
    required: false,
    enum: Object.values(ParticipationUnitBody),
    example: ParticipationUnitBody.Group,
    description: '부모 정책을 덮어쓸 참여 단위입니다.',
  })
  readonly participationUnit?: ParticipationUnitBody;

  @ApiProperty({
    required: false,
    enum: Object.values(ResultStorageModeBody),
    example: ResultStorageModeBody.Database,
    description: '부모 정책을 덮어쓸 결과 저장 대상입니다.',
  })
  readonly resultStorageMode?: ResultStorageModeBody;

  @ApiProperty({
    required: false,
    enum: Object.values(VoteWeightModeBody),
    example: VoteWeightModeBody.Share,
    description: '부모 정책을 덮어쓸 가중치 방식입니다.',
  })
  readonly voteWeightMode?: VoteWeightModeBody;
}

export class CreateVoteDetailBody {
  @ApiProperty({
    example: 'President',
    minLength: 1,
    maxLength: 200,
    description: '생성할 자식 투표 제목입니다.',
  })
  readonly title!: string;

  @ApiProperty({
    enum: Object.values(VoteDetailTypeBody),
    example: VoteDetailTypeBody.Candidate,
    description: '자식 투표 유형입니다.',
  })
  readonly type!: VoteDetailTypeBody;

  @ApiProperty({
    required: false,
    example: 0,
    minimum: 0,
    description: '자식 투표 정렬 순서입니다. 생략하면 0입니다.',
  })
  readonly sortOrder?: number;

  @ApiProperty({
    required: false,
    type: () => VotePolicyOverridesBody,
    description: '부모 투표 기본 정책을 덮어쓸 자식 투표 정책입니다.',
  })
  readonly overrides?: VotePolicyOverridesBody;
}

export class CreateVoteDetailParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: '부모 투표 ID입니다.',
  })
  readonly voteId!: string;
}

export class VoteDetailAttachmentParam extends CreateVoteDetailParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '44444444-4444-4444-8444-444444444444',
    description: '자식 투표 ID입니다.',
  })
  readonly voteDetailId!: string;
}

export class VoteDetailAttachmentManagementParam extends VoteDetailAttachmentParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '66666666-6666-4666-8666-666666666666',
    description: '첨부파일 관계 ID입니다.',
  })
  readonly attachmentId!: string;
}
