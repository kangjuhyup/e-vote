import { ApiProperty } from '@nestjs/swagger';

type ManageMemberSource = {
  readonly id: string;
  readonly electoralRollId: string;
  readonly identifier: string;
  readonly groupKey?: string;
  readonly voteWeight: number;
  readonly revision: number;
};

type RemoveMemberSource = {
  readonly electoralRollId: string;
  readonly memberId: string;
  readonly revision: number;
};

export class ManageElectoralRollMemberResponse {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly electoralRollId: string;
  @ApiProperty() readonly identifier: string;
  @ApiProperty({ required: false }) readonly groupKey?: string;
  @ApiProperty() readonly voteWeight: number;
  @ApiProperty() readonly revision: number;

  private constructor(source: ManageMemberSource) {
    this.id = source.id;
    this.electoralRollId = source.electoralRollId;
    this.identifier = source.identifier;
    if (source.groupKey !== undefined) this.groupKey = source.groupKey;
    this.voteWeight = source.voteWeight;
    this.revision = source.revision;
  }

  static of(source: ManageMemberSource): ManageElectoralRollMemberResponse {
    return new ManageElectoralRollMemberResponse(source);
  }
}

export class RemoveElectoralRollMemberResponse {
  @ApiProperty() readonly electoralRollId: string;
  @ApiProperty() readonly memberId: string;
  @ApiProperty() readonly revision: number;

  private constructor(source: RemoveMemberSource) {
    this.electoralRollId = source.electoralRollId;
    this.memberId = source.memberId;
    this.revision = source.revision;
  }

  static of(source: RemoveMemberSource): RemoveElectoralRollMemberResponse {
    return new RemoveElectoralRollMemberResponse(source);
  }
}
