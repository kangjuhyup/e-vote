import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetElectionCommissionParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '22222222-2222-4222-8222-222222222222',
    description: '상세 조회할 선거관리위원회 ID입니다.',
  })
  readonly commissionId!: string;
}
