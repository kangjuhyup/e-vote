import { ApiProperty } from '@nestjs/swagger';

const ParticipationUnitResponse = {
  Individual: 'INDIVIDUAL',
  Group: 'GROUP',
} as const;

type ParticipationUnitResponse =
  (typeof ParticipationUnitResponse)[keyof typeof ParticipationUnitResponse];

const VoteWeightModeResponse = {
  Equal: 'EQUAL',
  Share: 'SHARE',
} as const;

type VoteWeightModeResponse =
  (typeof VoteWeightModeResponse)[keyof typeof VoteWeightModeResponse];

type VoteTurnoutSource = {
  readonly voteId: string;
  readonly voteDetailId: string;
  readonly participationUnit: ParticipationUnitResponse;
  readonly voteWeightMode: VoteWeightModeResponse;
  readonly eligibleElectorCount: number;
  readonly eligibleVotingUnitCount: number;
  readonly participantCount: number;
  readonly participatedVotingUnitCount: number;
  readonly turnoutRate: number;
  readonly eligibleVoteWeight: number;
  readonly participatedVoteWeight: number;
  readonly weightedTurnoutRate: number;
};

export class GetVoteTurnoutResponse {
  @ApiProperty({ example: 'vote-1', description: '부모 투표 ID입니다.' })
  readonly voteId: string;

  @ApiProperty({
    example: 'vote-detail-1',
    description: '자식 투표 ID입니다.',
  })
  readonly voteDetailId: string;

  @ApiProperty({
    enum: Object.values(ParticipationUnitResponse),
    example: ParticipationUnitResponse.Individual,
    description: '투표 참여 단위입니다.',
  })
  readonly participationUnit: ParticipationUnitResponse;

  @ApiProperty({
    enum: Object.values(VoteWeightModeResponse),
    example: VoteWeightModeResponse.Share,
    description: '표 가중치 방식입니다.',
  })
  readonly voteWeightMode: VoteWeightModeResponse;

  @ApiProperty({
    example: 100,
    description: '투표 가능한 전체 선거인 수입니다.',
  })
  readonly eligibleElectorCount: number;

  @ApiProperty({
    example: 80,
    description:
      '투표 가능한 전체 투표권 단위 수입니다. 그룹 투표에서는 그룹 수입니다.',
  })
  readonly eligibleVotingUnitCount: number;

  @ApiProperty({ example: 60, description: '실제 참여 기록 수입니다.' })
  readonly participantCount: number;

  @ApiProperty({
    example: 60,
    description: '참여를 완료한 투표권 단위 수입니다.',
  })
  readonly participatedVotingUnitCount: number;

  @ApiProperty({
    example: 75,
    description: '투표권 단위 기준 투표율이며 단위는 퍼센트입니다.',
  })
  readonly turnoutRate: number;

  @ApiProperty({
    example: 1000,
    description: '투표 가능한 전체 표 가중치입니다.',
  })
  readonly eligibleVoteWeight: number;

  @ApiProperty({
    example: 640,
    description: '참여 완료된 표 가중치입니다.',
  })
  readonly participatedVoteWeight: number;

  @ApiProperty({
    example: 64,
    description: '표 가중치 기준 투표율이며 단위는 퍼센트입니다.',
  })
  readonly weightedTurnoutRate: number;

  private constructor(source: VoteTurnoutSource) {
    this.voteId = source.voteId;
    this.voteDetailId = source.voteDetailId;
    this.participationUnit = source.participationUnit;
    this.voteWeightMode = source.voteWeightMode;
    this.eligibleElectorCount = source.eligibleElectorCount;
    this.eligibleVotingUnitCount = source.eligibleVotingUnitCount;
    this.participantCount = source.participantCount;
    this.participatedVotingUnitCount = source.participatedVotingUnitCount;
    this.turnoutRate = source.turnoutRate;
    this.eligibleVoteWeight = source.eligibleVoteWeight;
    this.participatedVoteWeight = source.participatedVoteWeight;
    this.weightedTurnoutRate = source.weightedTurnoutRate;
  }

  static of(source: VoteTurnoutSource): GetVoteTurnoutResponse {
    return new GetVoteTurnoutResponse(source);
  }
}
