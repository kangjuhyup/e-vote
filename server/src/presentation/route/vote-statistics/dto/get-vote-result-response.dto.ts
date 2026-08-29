import { ApiProperty } from '@nestjs/swagger';

const CandidateStatusResponse = {
  Active: 'ACTIVE',
  Withdrawn: 'WITHDRAWN',
} as const;

type CandidateStatusResponse =
  (typeof CandidateStatusResponse)[keyof typeof CandidateStatusResponse];

const PrivacyModeResponse = {
  Secret: 'SECRET',
  Public: 'PUBLIC',
} as const;

type PrivacyModeResponse =
  (typeof PrivacyModeResponse)[keyof typeof PrivacyModeResponse];

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

const VotingChannelResponse = {
  Online: 'ONLINE',
  Onsite: 'ONSITE',
  Visit: 'VISIT',
} as const;

type VotingChannelResponse =
  (typeof VotingChannelResponse)[keyof typeof VotingChannelResponse];

type CandidateVoteResultSource = {
  readonly candidateId: string;
  readonly candidateNo: number;
  readonly name: string;
  readonly status: CandidateStatusResponse;
  readonly voteCount: number;
  readonly voteRate: number;
  readonly weightedVoteCount: number;
  readonly weightedVoteRate: number;
};

export class CandidateVoteResultResponse {
  @ApiProperty({ example: 'candidate-1', description: '후보 ID입니다.' })
  readonly candidateId: string;

  @ApiProperty({ example: 1, description: '후보 번호입니다.' })
  readonly candidateNo: number;

  @ApiProperty({ example: 'Candidate 1', description: '후보 이름입니다.' })
  readonly name: string;

  @ApiProperty({
    enum: Object.values(CandidateStatusResponse),
    example: CandidateStatusResponse.Active,
    description: '후보 상태입니다.',
  })
  readonly status: CandidateStatusResponse;

  @ApiProperty({ example: 42, description: '후보의 실제 득표 수입니다.' })
  readonly voteCount: number;

  @ApiProperty({
    example: 52.5,
    description: '실제 득표 수 기준 득표율이며 단위는 퍼센트입니다.',
  })
  readonly voteRate: number;

  @ApiProperty({
    example: 420,
    description: '후보의 가중 득표 수입니다.',
  })
  readonly weightedVoteCount: number;

  @ApiProperty({
    example: 60,
    description: '가중 득표 수 기준 득표율이며 단위는 퍼센트입니다.',
  })
  readonly weightedVoteRate: number;

  private constructor(source: CandidateVoteResultSource) {
    this.candidateId = source.candidateId;
    this.candidateNo = source.candidateNo;
    this.name = source.name;
    this.status = source.status;
    this.voteCount = source.voteCount;
    this.voteRate = source.voteRate;
    this.weightedVoteCount = source.weightedVoteCount;
    this.weightedVoteRate = source.weightedVoteRate;
  }

  static of(source: CandidateVoteResultSource): CandidateVoteResultResponse {
    return new CandidateVoteResultResponse(source);
  }
}

type VotingChannelResultSource = {
  readonly channel: VotingChannelResponse;
  readonly participantCount: number;
  readonly participationRate: number;
  readonly participatedVoteWeight: number;
  readonly weightedParticipationRate: number;
};

export class VotingChannelResultResponse {
  @ApiProperty({
    enum: Object.values(VotingChannelResponse),
    example: VotingChannelResponse.Online,
    description: '투표 참여 채널입니다.',
  })
  readonly channel: VotingChannelResponse;

  @ApiProperty({ example: 50, description: '채널별 참여자 수입니다.' })
  readonly participantCount: number;

  @ApiProperty({
    example: 62.5,
    description: '전체 참여자 중 해당 채널의 비율입니다.',
  })
  readonly participationRate: number;

  @ApiProperty({
    example: 500,
    description: '채널별 참여 완료 표 가중치입니다.',
  })
  readonly participatedVoteWeight: number;

  @ApiProperty({
    example: 71.43,
    description: '전체 참여 가중치 중 해당 채널의 비율입니다.',
  })
  readonly weightedParticipationRate: number;

  private constructor(source: VotingChannelResultSource) {
    this.channel = source.channel;
    this.participantCount = source.participantCount;
    this.participationRate = source.participationRate;
    this.participatedVoteWeight = source.participatedVoteWeight;
    this.weightedParticipationRate = source.weightedParticipationRate;
  }

  static of(source: VotingChannelResultSource): VotingChannelResultResponse {
    return new VotingChannelResultResponse(source);
  }
}

type VoteResultSource = {
  readonly voteId: string;
  readonly voteDetailId: string;
  readonly privacyMode: PrivacyModeResponse;
  readonly participationUnit: ParticipationUnitResponse;
  readonly voteWeightMode: VoteWeightModeResponse;
  readonly participantCount: number;
  readonly participatedVoteWeight: number;
  readonly totalVoteCount: number;
  readonly totalWeightedVoteCount: number;
  readonly candidates: readonly CandidateVoteResultSource[];
  readonly votingChannels: readonly VotingChannelResultSource[];
};

export class GetVoteResultResponse {
  @ApiProperty({ example: 'vote-1', description: '부모 투표 ID입니다.' })
  readonly voteId: string;

  @ApiProperty({ example: 'vote-detail-1', description: '자식 투표 ID입니다.' })
  readonly voteDetailId: string;

  @ApiProperty({
    enum: Object.values(PrivacyModeResponse),
    example: PrivacyModeResponse.Secret,
    description: '투표 공개 범위입니다.',
  })
  readonly privacyMode: PrivacyModeResponse;

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

  @ApiProperty({ example: 80, description: '전체 참여자 수입니다.' })
  readonly participantCount: number;

  @ApiProperty({ example: 700, description: '전체 참여 표 가중치입니다.' })
  readonly participatedVoteWeight: number;

  @ApiProperty({ example: 80, description: '후보별 실제 득표 수 합계입니다.' })
  readonly totalVoteCount: number;

  @ApiProperty({ example: 700, description: '후보별 가중 득표 수 합계입니다.' })
  readonly totalWeightedVoteCount: number;

  @ApiProperty({
    type: () => [CandidateVoteResultResponse],
    description: '후보별 득표 결과입니다.',
  })
  readonly candidates: readonly CandidateVoteResultResponse[];

  @ApiProperty({
    type: () => [VotingChannelResultResponse],
    description: '투표 참여 채널별 집계입니다.',
  })
  readonly votingChannels: readonly VotingChannelResultResponse[];

  private constructor(source: VoteResultSource) {
    this.voteId = source.voteId;
    this.voteDetailId = source.voteDetailId;
    this.privacyMode = source.privacyMode;
    this.participationUnit = source.participationUnit;
    this.voteWeightMode = source.voteWeightMode;
    this.participantCount = source.participantCount;
    this.participatedVoteWeight = source.participatedVoteWeight;
    this.totalVoteCount = source.totalVoteCount;
    this.totalWeightedVoteCount = source.totalWeightedVoteCount;
    this.candidates = source.candidates.map((candidate) =>
      CandidateVoteResultResponse.of(candidate),
    );
    this.votingChannels = source.votingChannels.map((channel) =>
      VotingChannelResultResponse.of(channel),
    );
  }

  static of(source: VoteResultSource): GetVoteResultResponse {
    return new GetVoteResultResponse(source);
  }
}
