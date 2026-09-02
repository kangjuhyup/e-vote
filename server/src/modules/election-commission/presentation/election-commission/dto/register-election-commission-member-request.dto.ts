import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

const ElectionCommissionMemberRoleBody = {
  Admin: 'ADMIN',
  FieldManager: 'FIELD_MANAGER',
} as const;

type ElectionCommissionMemberRoleBody =
  (typeof ElectionCommissionMemberRoleBody)[keyof typeof ElectionCommissionMemberRoleBody];

export class RegisterElectionCommissionMemberBody {
  @ApiProperty({
    example: 'oidc-subject-1',
    minLength: 1,
    maxLength: 255,
    description:
      '위원 권한을 부여할 사용자의 UserPrincipal.id(OIDC subject)입니다.',
  })
  readonly userPrincipalId!: string;

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
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '22222222-2222-4222-8222-222222222222',
    description: '위원을 등록할 선거관리위원회 ID입니다.',
  })
  readonly commissionId!: string;
}
