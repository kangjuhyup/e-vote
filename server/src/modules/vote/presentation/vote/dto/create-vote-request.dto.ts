import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

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

const VotingChannelBody = {
  Online: 'ONLINE',
  Onsite: 'ONSITE',
  Visit: 'VISIT',
} as const;

type VotingChannelBody =
  (typeof VotingChannelBody)[keyof typeof VotingChannelBody];

class VotePolicyBody {
  @ApiProperty({
    enum: Object.values(PrivacyModeBody),
    example: PrivacyModeBody.Secret,
    description: '투표 공개 여부 정책입니다.',
  })
  readonly privacyMode!: PrivacyModeBody;

  @ApiProperty({
    enum: Object.values(ParticipationUnitBody),
    example: ParticipationUnitBody.Individual,
    description: '개인별 또는 그룹별 참여 단위입니다.',
  })
  readonly participationUnit!: ParticipationUnitBody;

  @ApiProperty({
    enum: Object.values(ResultStorageModeBody),
    example: ResultStorageModeBody.Database,
    description: '결과 저장 대상입니다.',
  })
  readonly resultStorageMode!: ResultStorageModeBody;

  @ApiProperty({
    enum: Object.values(VoteWeightModeBody),
    example: VoteWeightModeBody.Equal,
    description: '동일 가중치 또는 지분 가중치 투표 방식입니다.',
  })
  readonly voteWeightMode!: VoteWeightModeBody;
}

class IdentityVerificationPolicyBody {
  @ApiProperty({
    example: false,
    description: '본인인증 요구 여부입니다.',
  })
  readonly required!: boolean;

  @ApiProperty({
    required: false,
    example: 'PASS',
    description: '본인인증 제공자입니다. required가 false이면 생략합니다.',
  })
  readonly provider?: string;

  @ApiProperty({
    required: false,
    example: 'MOBILE',
    description: '본인인증 방식입니다. required가 false이면 생략합니다.',
  })
  readonly method?: string;
}

export class CreateVoteBody {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '22222222-2222-4222-8222-222222222222',
    description: '투표를 주관하는 선거관리위원회 ID입니다.',
  })
  readonly commissionId!: string;

  @ApiProperty({
    example: 'Board election',
    minLength: 1,
    maxLength: 200,
    description: '생성할 부모 투표 제목입니다.',
  })
  readonly title!: string;

  @ApiProperty({
    enum: Object.values(VotingChannelBody),
    isArray: true,
    example: [VotingChannelBody.Online, VotingChannelBody.Onsite],
    description: '부모 투표 단위로 허용하는 투표 채널입니다.',
  })
  readonly votingChannels!: VotingChannelBody[];

  @ApiProperty({
    type: () => VotePolicyBody,
    description: '부모 투표의 기본 정책입니다.',
  })
  readonly defaultPolicy!: VotePolicyBody;

  @ApiProperty({
    type: () => IdentityVerificationPolicyBody,
    description: '부모 투표의 본인인증 정책입니다.',
  })
  readonly identityVerificationPolicy!: IdentityVerificationPolicyBody;

  @IsOptional()
  @IsISO8601({ strict: true })
  @ApiProperty({
    required: false,
    format: 'date-time',
    description: '투표 개시 시각입니다. 생략하면 생성 시각을 사용합니다.',
  })
  readonly startedAt?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @ApiProperty({
    required: false,
    format: 'date-time',
    description: '투표 종료 시각입니다. 생략하면 개시 시각을 사용합니다.',
  })
  readonly endedAt?: string;
}

export class VoteParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: '부모 투표 ID입니다.',
  })
  readonly voteId!: string;
}
