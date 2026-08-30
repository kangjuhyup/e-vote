import { ApiProperty } from '@nestjs/swagger';
import { MaskedPersonalData } from '../../../common/decorator/masked-personal-data.decorator';

const ElectionCommissionStatusResponse = {
  Active: 'ACTIVE',
  Suspended: 'SUSPENDED',
} as const;

const ElectionCommissionMemberRoleResponse = {
  Admin: 'ADMIN',
  FieldManager: 'FIELD_MANAGER',
} as const;

const ElectionCommissionMemberStatusResponse = {
  Active: 'ACTIVE',
  Inactive: 'INACTIVE',
} as const;

type ElectionCommissionSummarySource = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

type ElectionCommissionMemberSource = {
  readonly id: string;
  readonly commissionId: string;
  readonly name: string;
  readonly role: string;
  readonly status: string;
  readonly registeredAt: Date;
  readonly updatedAt: Date;
};

type ElectionCommissionSource = ElectionCommissionSummarySource & {
  readonly members: readonly ElectionCommissionMemberSource[];
};

export class ElectionCommissionSummaryResponse {
  @ApiProperty({
    example: 'commission-1',
    description: '선거관리위원회 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: '중앙 선거관리위원회',
    description: '선거관리위원회 이름입니다.',
  })
  readonly name: string;

  @ApiProperty({
    enum: Object.values(ElectionCommissionStatusResponse),
    example: ElectionCommissionStatusResponse.Active,
    description: '선거관리위원회 상태입니다.',
  })
  readonly status: string;

  @ApiProperty({
    example: '2026-08-30T00:00:00.000Z',
    format: 'date-time',
    description: '생성 시각입니다.',
  })
  readonly createdAt: string;

  @ApiProperty({
    example: '2026-08-30T01:00:00.000Z',
    format: 'date-time',
    description: '수정 시각입니다.',
  })
  readonly updatedAt: string;

  private constructor(source: ElectionCommissionSummarySource) {
    this.id = source.id;
    this.name = source.name;
    this.status = source.status;
    this.createdAt = source.createdAt.toISOString();
    this.updatedAt = source.updatedAt.toISOString();
  }

  static of(
    source: ElectionCommissionSummarySource,
  ): ElectionCommissionSummaryResponse {
    return new ElectionCommissionSummaryResponse(source);
  }
}

export class ElectionCommissionMemberResponse {
  @ApiProperty({
    example: 'member-1',
    description: '선거관리위원 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'commission-1',
    description: '소속 선거관리위원회 ID입니다.',
  })
  readonly commissionId: string;

  @MaskedPersonalData('name')
  @ApiProperty({
    example: '김*',
    description: '마스킹된 선거관리위원 이름입니다.',
  })
  readonly name: string;

  @ApiProperty({
    enum: Object.values(ElectionCommissionMemberRoleResponse),
    example: ElectionCommissionMemberRoleResponse.FieldManager,
    description: '선거관리위원 역할입니다.',
  })
  readonly role: string;

  @ApiProperty({
    enum: Object.values(ElectionCommissionMemberStatusResponse),
    example: ElectionCommissionMemberStatusResponse.Active,
    description: '선거관리위원 상태입니다.',
  })
  readonly status: string;

  @ApiProperty({
    example: '2026-08-30T00:01:00.000Z',
    format: 'date-time',
    description: '등록 시각입니다.',
  })
  readonly registeredAt: string;

  @ApiProperty({
    example: '2026-08-30T01:01:00.000Z',
    format: 'date-time',
    description: '수정 시각입니다.',
  })
  readonly updatedAt: string;

  private constructor(source: ElectionCommissionMemberSource) {
    this.id = source.id;
    this.commissionId = source.commissionId;
    this.name = source.name;
    this.role = source.role;
    this.status = source.status;
    this.registeredAt = source.registeredAt.toISOString();
    this.updatedAt = source.updatedAt.toISOString();
  }

  static of(
    source: ElectionCommissionMemberSource,
  ): ElectionCommissionMemberResponse {
    return new ElectionCommissionMemberResponse(source);
  }
}

export class GetElectionCommissionResponse {
  @ApiProperty({
    example: 'commission-1',
    description: '선거관리위원회 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: '중앙 선거관리위원회',
    description: '선거관리위원회 이름입니다.',
  })
  readonly name: string;

  @ApiProperty({
    enum: Object.values(ElectionCommissionStatusResponse),
    example: ElectionCommissionStatusResponse.Active,
    description: '선거관리위원회 상태입니다.',
  })
  readonly status: string;

  @ApiProperty({
    type: () => [ElectionCommissionMemberResponse],
    description: '선거관리위원회에 등록된 위원 목록입니다.',
  })
  readonly members: readonly ElectionCommissionMemberResponse[];

  @ApiProperty({
    example: '2026-08-30T00:00:00.000Z',
    format: 'date-time',
    description: '생성 시각입니다.',
  })
  readonly createdAt: string;

  @ApiProperty({
    example: '2026-08-30T01:00:00.000Z',
    format: 'date-time',
    description: '수정 시각입니다.',
  })
  readonly updatedAt: string;

  private constructor(source: ElectionCommissionSource) {
    this.id = source.id;
    this.name = source.name;
    this.status = source.status;
    this.members = source.members.map((member) =>
      ElectionCommissionMemberResponse.of(member),
    );
    this.createdAt = source.createdAt.toISOString();
    this.updatedAt = source.updatedAt.toISOString();
  }

  static of(source: ElectionCommissionSource): GetElectionCommissionResponse {
    return new GetElectionCommissionResponse(source);
  }
}
