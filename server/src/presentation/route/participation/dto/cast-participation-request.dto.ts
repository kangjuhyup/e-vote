import { ApiProperty } from '@nestjs/swagger';

const VotingChannelBody = {
  Online: 'ONLINE',
  Onsite: 'ONSITE',
  Visit: 'VISIT',
} as const;

type VotingChannelBody =
  (typeof VotingChannelBody)[keyof typeof VotingChannelBody];

export class CastParticipationBody {
  @ApiProperty({
    example: 'vote-1',
    description: '참여할 부모 투표 ID입니다.',
  })
  readonly voteId!: string;

  @ApiProperty({
    example: 'detail-1',
    description: '참여할 자식 투표 ID입니다.',
  })
  readonly voteDetailId!: string;

  @ApiProperty({
    example: 'elector-1',
    description: '투표에 참여하는 선거인 ID입니다.',
  })
  readonly electorId!: string;

  @ApiProperty({
    example: 'candidate-1',
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

  @ApiProperty({
    required: false,
    example: 'session-1',
    description: '현장 또는 방문 투표 세션 ID입니다.',
  })
  readonly fieldVotingSessionId?: string;

  @ApiProperty({
    example: '2026-08-20T01:00:00.000Z',
    description: '투표 참여 시각입니다.',
  })
  readonly participatedAt!: string;
}
