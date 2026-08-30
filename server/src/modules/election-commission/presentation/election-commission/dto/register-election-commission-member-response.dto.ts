import { ApiProperty } from '@nestjs/swagger';

const ElectionCommissionMemberStatusResponse = {
  Active: 'ACTIVE',
  Inactive: 'INACTIVE',
} as const;

export class RegisterElectionCommissionMemberResponse {
  @ApiProperty({
    example: 'member-1',
    description: '등록된 선거관리위원 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'commission-1',
    description: '선거관리위원이 속한 선거관리위원회 ID입니다.',
  })
  readonly commissionId: string;

  @ApiProperty({
    enum: Object.values(ElectionCommissionMemberStatusResponse),
    example: ElectionCommissionMemberStatusResponse.Active,
    description: '등록된 선거관리위원 상태입니다.',
  })
  readonly status: string;

  private constructor(id: string, commissionId: string, status: string) {
    this.id = id;
    this.commissionId = commissionId;
    this.status = status;
  }

  static of(result: {
    readonly id: string;
    readonly commissionId: string;
    readonly status: string;
  }): RegisterElectionCommissionMemberResponse {
    return new RegisterElectionCommissionMemberResponse(
      result.id,
      result.commissionId,
      result.status,
    );
  }
}
