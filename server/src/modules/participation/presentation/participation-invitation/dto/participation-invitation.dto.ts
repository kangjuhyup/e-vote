import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class ParticipationInvitationVoteParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly voteId!: string;
}

export class ParticipationInvitationElectorParam extends ParticipationInvitationVoteParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly electorId!: string;
}

export class DispatchParticipationInvitationsBody {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ApiProperty({ required: false, type: [String], format: 'uuid' })
  readonly electorIds?: readonly string[];
}

export class DispatchParticipationInvitationsResponse {
  @ApiProperty() readonly totalCount: number;
  @ApiProperty() readonly queuedCount: number;
  @ApiProperty() readonly skippedCount: number;

  private constructor(params: DispatchParticipationInvitationsResponse) {
    this.totalCount = params.totalCount;
    this.queuedCount = params.queuedCount;
    this.skippedCount = params.skippedCount;
  }

  static of(
    params: DispatchParticipationInvitationsResponse,
  ): DispatchParticipationInvitationsResponse {
    return new DispatchParticipationInvitationsResponse(params);
  }
}
