import { ApiProperty } from '@nestjs/swagger';

const ElectionCommissionStatusResponse = {
  Active: 'ACTIVE',
  Suspended: 'SUSPENDED',
} as const;

export class CreateElectionCommissionResponse {
  @ApiProperty({
    example: 'commission-1',
    description: '생성된 선거관리위원회 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    enum: Object.values(ElectionCommissionStatusResponse),
    example: ElectionCommissionStatusResponse.Active,
    description: '생성된 선거관리위원회 상태입니다.',
  })
  readonly status: string;

  private constructor(id: string, status: string) {
    this.id = id;
    this.status = status;
  }

  static of(result: {
    readonly id: string;
    readonly status: string;
  }): CreateElectionCommissionResponse {
    return new CreateElectionCommissionResponse(result.id, result.status);
  }
}
