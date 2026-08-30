import { ApiProperty } from '@nestjs/swagger';
import { MaskedPersonalData } from '../../../../../shared/presentation/common/decorator/masked-personal-data.decorator';

const ElectorStatusResponse = {
  Eligible: 'ELIGIBLE',
  Blocked: 'BLOCKED',
} as const;

export class CreateElectorResponse {
  @ApiProperty({
    example: 'elector-1',
    description: '생성된 선거인 ID입니다.',
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
    enum: Object.values(ElectorStatusResponse),
    example: ElectorStatusResponse.Eligible,
    description: '생성된 선거인 상태입니다.',
  })
  readonly status: string;

  private constructor(
    id: string,
    voteId: string,
    name: string,
    phoneNumber: string | undefined,
    birthDate: string | undefined,
    status: string,
  ) {
    this.id = id;
    this.voteId = voteId;
    this.name = name;
    if (phoneNumber !== undefined) {
      this.phoneNumber = phoneNumber;
    }
    if (birthDate !== undefined) {
      this.birthDate = birthDate;
    }
    this.status = status;
  }

  static of(result: {
    readonly id: string;
    readonly voteId: string;
    readonly name: string;
    readonly phoneNumber?: string;
    readonly birthDate?: string;
    readonly status: string;
  }): CreateElectorResponse {
    return new CreateElectorResponse(
      result.id,
      result.voteId,
      result.name,
      result.phoneNumber,
      result.birthDate,
      result.status,
    );
  }
}
