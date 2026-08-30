import { ApiProperty } from '@nestjs/swagger';

const ElectionCommissionMemberRoleBody = {
  Admin: 'ADMIN',
  FieldManager: 'FIELD_MANAGER',
} as const;

type ElectionCommissionMemberRoleBody =
  (typeof ElectionCommissionMemberRoleBody)[keyof typeof ElectionCommissionMemberRoleBody];

export class RegisterElectionCommissionMemberBody {
  @ApiProperty({
    example: 'Kim Manager',
    minLength: 1,
    maxLength: 100,
    description: '등록할 선거관리위원 이름입니다.',
  })
  readonly name!: string;

  @ApiProperty({
    enum: Object.values(ElectionCommissionMemberRoleBody),
    example: ElectionCommissionMemberRoleBody.FieldManager,
    description: '선거관리위원 역할입니다.',
  })
  readonly role!: ElectionCommissionMemberRoleBody;
}

export class RegisterElectionCommissionMemberParam {
  @ApiProperty({
    example: 'commission-1',
    description: '위원을 등록할 선거관리위원회 ID입니다.',
  })
  readonly commissionId!: string;
}
