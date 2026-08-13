import { ApiProperty } from '@nestjs/swagger';

const VotingChannelBody = {
  Onsite: 'ONSITE',
  Visit: 'VISIT',
} as const;

type VotingChannelBody =
  (typeof VotingChannelBody)[keyof typeof VotingChannelBody];

export class CreateFieldVotingSessionBody {
  @ApiProperty({
    example: 'commission-1',
    description: '현장 투표 세션을 운영하는 선거관리위원회 ID입니다.',
  })
  readonly commissionId!: string;

  @ApiProperty({
    enum: Object.values(VotingChannelBody),
    example: VotingChannelBody.Onsite,
    description: '현장 투표 채널입니다.',
  })
  readonly channel!: VotingChannelBody;

  @ApiProperty({
    example: 'Lobby voting desk',
    minLength: 1,
    maxLength: 100,
    description: '현장 투표 세션 제목입니다.',
  })
  readonly title!: string;

  @ApiProperty({
    example: 'Main Lobby',
    minLength: 1,
    maxLength: 100,
    description: '현장 또는 방문 투표 장소 이름입니다.',
  })
  readonly locationName!: string;

  @ApiProperty({
    example: 'Seoul Office',
    minLength: 1,
    maxLength: 200,
    description: '현장 또는 방문 투표 주소입니다.',
  })
  readonly address!: string;

  @ApiProperty({
    isArray: true,
    example: ['member-1'],
    description: '현장 투표를 관리할 선거관리위원 ID 목록입니다.',
  })
  readonly managerIds!: string[];

  @ApiProperty({
    example: '2026-08-20T00:00:00.000Z',
    description: '현장 투표 세션 시작 시각입니다.',
  })
  readonly startsAt!: string;

  @ApiProperty({
    example: '2026-08-20T09:00:00.000Z',
    description: '현장 투표 세션 종료 시각입니다.',
  })
  readonly endsAt!: string;
}

export class CreateFieldVotingSessionParam {
  @ApiProperty({
    example: 'vote-1',
    description: '현장 투표 세션을 만들 부모 투표 ID입니다.',
  })
  readonly voteId!: string;
}
