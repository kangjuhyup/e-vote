import { ApiProperty } from '@nestjs/swagger';

type AddMembersSource = {
  readonly electoralRollId: string;
  readonly revision: number;
  readonly addedMemberCount: number;
};

export class AddElectoralRollMembersResponse {
  @ApiProperty() readonly electoralRollId: string;
  @ApiProperty() readonly revision: number;
  @ApiProperty() readonly addedMemberCount: number;

  private constructor(source: AddMembersSource) {
    this.electoralRollId = source.electoralRollId;
    this.revision = source.revision;
    this.addedMemberCount = source.addedMemberCount;
  }

  static of(source: AddMembersSource): AddElectoralRollMembersResponse {
    return new AddElectoralRollMembersResponse(source);
  }
}
