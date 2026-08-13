import { ApiProperty } from '@nestjs/swagger';

export class AuthenticateElectorBody {
  @ApiProperty({
    example: 'PASS',
    minLength: 1,
    maxLength: 50,
    description: '선거인 본인인증 제공자입니다.',
  })
  readonly provider!: string;

  @ApiProperty({
    example: 'tx-1',
    minLength: 1,
    maxLength: 200,
    description: '본인인증 제공자가 발급한 인증 거래 ID입니다.',
  })
  readonly transactionId!: string;

  @ApiProperty({
    example: '2026-08-13T00:00:00.000Z',
    format: 'date-time',
    description: '본인인증 완료 시각입니다.',
  })
  readonly verifiedAt!: string;
}

export class AuthenticateElectorParam {
  @ApiProperty({
    example: 'vote-1',
    description: '선거인이 속한 부모 투표 ID입니다.',
  })
  readonly voteId!: string;

  @ApiProperty({
    example: 'elector-1',
    description: '본인인증할 선거인 ID입니다.',
  })
  readonly electorId!: string;
}
