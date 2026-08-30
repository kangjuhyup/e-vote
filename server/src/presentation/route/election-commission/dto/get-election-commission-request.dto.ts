import { ApiProperty } from '@nestjs/swagger';

export class GetElectionCommissionParam {
  @ApiProperty({
    example: 'commission-1',
    description: '상세 조회할 선거관리위원회 ID입니다.',
  })
  readonly commissionId!: string;
}
