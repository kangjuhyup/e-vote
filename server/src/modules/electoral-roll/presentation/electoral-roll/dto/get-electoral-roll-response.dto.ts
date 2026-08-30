import { ApiProperty } from '@nestjs/swagger';

type MemberSource = {
  readonly id: string;
  readonly electoralRollId: string;
  readonly identifier: string;
  readonly groupKey?: string;
  readonly voteWeight: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

type ElectoralRollSource = {
  readonly id: string;
  readonly commissionId: string;
  readonly name: string;
  readonly revision: number;
  readonly members: readonly MemberSource[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class ElectoralRollMemberResponse {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly electoralRollId: string;
  @ApiProperty() readonly identifier: string;
  @ApiProperty({ required: false }) readonly groupKey?: string;
  @ApiProperty() readonly voteWeight: number;
  @ApiProperty({ format: 'date-time' }) readonly createdAt: string;
  @ApiProperty({ format: 'date-time' }) readonly updatedAt: string;

  private constructor(source: MemberSource) {
    this.id = source.id;
    this.electoralRollId = source.electoralRollId;
    this.identifier = source.identifier;
    if (source.groupKey !== undefined) this.groupKey = source.groupKey;
    this.voteWeight = source.voteWeight;
    this.createdAt = source.createdAt.toISOString();
    this.updatedAt = source.updatedAt.toISOString();
  }

  static of(source: MemberSource): ElectoralRollMemberResponse {
    return new ElectoralRollMemberResponse(source);
  }
}

export class GetElectoralRollResponse {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly commissionId: string;
  @ApiProperty() readonly name: string;
  @ApiProperty() readonly revision: number;
  @ApiProperty({ type: () => [ElectoralRollMemberResponse] })
  readonly members: readonly ElectoralRollMemberResponse[];
  @ApiProperty({ format: 'date-time' }) readonly createdAt: string;
  @ApiProperty({ format: 'date-time' }) readonly updatedAt: string;

  private constructor(source: ElectoralRollSource) {
    this.id = source.id;
    this.commissionId = source.commissionId;
    this.name = source.name;
    this.revision = source.revision;
    this.members = source.members.map((member) =>
      ElectoralRollMemberResponse.of(member),
    );
    this.createdAt = source.createdAt.toISOString();
    this.updatedAt = source.updatedAt.toISOString();
  }

  static of(source: ElectoralRollSource): GetElectoralRollResponse {
    return new GetElectoralRollResponse(source);
  }
}
