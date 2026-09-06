import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  Length,
  IsOptional,
  IsISO8601,
} from 'class-validator';

export class AuthenticateElectorBody {
  @ApiProperty({
    example: 'MOCK',
    minLength: 1,
    maxLength: 50,
    description: '선거인 본인인증 제공자입니다.',
  })
  @IsString()
  @Length(1, 50)
  readonly provider!: string;

  @ApiProperty({
    example: 'mock-success:11111111-1111-4111-8111-111111111111',
    minLength: 1,
    maxLength: 200,
    description: '본인인증 제공자가 발급한 인증 거래 ID입니다.',
  })
  @IsString()
  @Length(1, 200)
  readonly transactionId!: string;

  @ApiProperty({
    example: '2026-08-13T00:00:00.000Z',
    format: 'date-time',
    description: '호환성용 필드입니다. 인증 기록 시각은 서버가 결정합니다.',
    required: false,
  })
  @IsOptional()
  @IsISO8601()
  readonly verifiedAt?: string;
}

export class AuthenticateElectorParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: '선거인이 속한 부모 투표 ID입니다.',
  })
  readonly voteId!: string;

  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '33333333-3333-4333-8333-333333333333',
    description: '본인인증할 선거인 ID입니다.',
  })
  readonly electorId!: string;
}
