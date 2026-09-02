import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

const VotingChannelBody = {
  Online: 'ONLINE',
  Onsite: 'ONSITE',
  Visit: 'VISIT',
} as const;

type VotingChannelBody =
  (typeof VotingChannelBody)[keyof typeof VotingChannelBody];

export class CastParticipationBody {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: '참여할 부모 투표 ID입니다.',
  })
  readonly voteId!: string;

  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '44444444-4444-4444-8444-444444444444',
    description: '참여할 자식 투표 ID입니다.',
  })
  readonly voteDetailId!: string;

  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '33333333-3333-4333-8333-333333333333',
    description: '투표에 참여하는 선거인 ID입니다.',
  })
  readonly electorId!: string;

  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '55555555-5555-4555-8555-555555555555',
    description:
      '선택한 후보 ID입니다. 비밀투표에서는 참여 기록과 분리해 집계합니다.',
  })
  readonly selectedCandidateId!: string;

  @ApiProperty({
    enum: Object.values(VotingChannelBody),
    example: VotingChannelBody.Onsite,
    description: '참여 채널입니다.',
  })
  readonly votingChannel!: VotingChannelBody;

  @IsOptional()
  @IsUUID()
  @ApiProperty({
    required: false,
    format: 'uuid',
    example: '66666666-6666-4666-8666-666666666666',
    description: '현장 또는 방문 투표 세션 ID입니다.',
  })
  readonly fieldVotingSessionId?: string;

  @ApiProperty({
    example: '2026-08-20T01:00:00.000Z',
    description: '투표 참여 시각입니다.',
  })
  readonly participatedAt!: string;
}
