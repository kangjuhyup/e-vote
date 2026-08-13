import { ApiProperty } from '@nestjs/swagger';
import { MaskedPersonalData } from '../../../common/decorator/masked-personal-data.decorator';

const ElectorStatusResponse = {
  Eligible: 'ELIGIBLE',
  Blocked: 'BLOCKED',
} as const;

type ElectorSource = {
  readonly id: string;
  readonly voteId: string;
  readonly name: string;
  readonly identifier: string;
  readonly phoneNumber?: string;
  readonly birthDate?: string;
  readonly groupKey?: string;
  readonly voteWeight: number;
  readonly status: string;
  readonly identityVerified: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class GetElectorResponse {
  @ApiProperty({
    example: 'elector-1',
    description: '선거인 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'vote-1',
    description: '선거인이 속한 부모 투표 ID입니다.',
  })
  readonly voteId: string;

  @MaskedPersonalData('name')
  @ApiProperty({
    example: 'K********u',
    description: '마스킹된 선거인 이름입니다.',
  })
  readonly name: string;

  @ApiProperty({
    example: 'member-1',
    description: '선거인 업무 식별자입니다.',
  })
  readonly identifier: string;

  @MaskedPersonalData('phoneNumber')
  @ApiProperty({
    required: false,
    example: '010-****-5678',
    description: '마스킹된 선거인 휴대폰번호입니다.',
  })
  readonly phoneNumber?: string;

  @MaskedPersonalData('birthDate')
  @ApiProperty({
    required: false,
    example: '1990-**-**',
    description: '마스킹된 선거인 생년월일입니다.',
  })
  readonly birthDate?: string;

  @ApiProperty({
    required: false,
    example: 'group-1',
    description: '그룹 투표에서 사용하는 그룹 키입니다.',
  })
  readonly groupKey?: string;

  @ApiProperty({
    example: 1,
    description: '지분 투표에서 사용하는 선거인 가중치입니다.',
  })
  readonly voteWeight: number;

  @ApiProperty({
    enum: Object.values(ElectorStatusResponse),
    example: ElectorStatusResponse.Eligible,
    description: '선거인 상태입니다.',
  })
  readonly status: string;

  @ApiProperty({
    example: false,
    description: '선거인 본인인증 완료 여부입니다.',
  })
  readonly identityVerified: boolean;

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

  private constructor(source: ElectorSource) {
    this.id = source.id;
    this.voteId = source.voteId;
    this.name = source.name;
    this.identifier = source.identifier;
    if (source.phoneNumber !== undefined) {
      this.phoneNumber = source.phoneNumber;
    }
    if (source.birthDate !== undefined) {
      this.birthDate = source.birthDate;
    }
    if (source.groupKey !== undefined) {
      this.groupKey = source.groupKey;
    }
    this.voteWeight = source.voteWeight;
    this.status = source.status;
    this.identityVerified = source.identityVerified;
    this.createdAt = source.createdAt.toISOString();
    this.updatedAt = source.updatedAt.toISOString();
  }

  static of(source: ElectorSource): GetElectorResponse {
    return new GetElectorResponse(source);
  }
}
