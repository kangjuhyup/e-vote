import { ApiProperty } from '@nestjs/swagger';

type SessionSource = {
  readonly id: string;
  readonly commissionId: string;
  readonly voteId: string;
  readonly channel: string;
  readonly title: string;
  readonly locationName: string;
  readonly address: string;
  readonly managerIds: readonly string[];
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class GetFieldVotingSessionResponse {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly commissionId: string;
  @ApiProperty() readonly voteId: string;
  @ApiProperty() readonly channel: string;
  @ApiProperty() readonly title: string;
  @ApiProperty() readonly locationName: string;
  @ApiProperty() readonly address: string;
  @ApiProperty({ type: [String] }) readonly managerIds: readonly string[];
  @ApiProperty({ format: 'date-time' }) readonly startsAt: string;
  @ApiProperty({ format: 'date-time' }) readonly endsAt: string;
  @ApiProperty() readonly status: string;
  @ApiProperty({ format: 'date-time' }) readonly createdAt: string;
  @ApiProperty({ format: 'date-time' }) readonly updatedAt: string;

  private constructor(source: SessionSource) {
    this.id = source.id;
    this.commissionId = source.commissionId;
    this.voteId = source.voteId;
    this.channel = source.channel;
    this.title = source.title;
    this.locationName = source.locationName;
    this.address = source.address;
    this.managerIds = source.managerIds;
    this.startsAt = source.startsAt.toISOString();
    this.endsAt = source.endsAt.toISOString();
    this.status = source.status;
    this.createdAt = source.createdAt.toISOString();
    this.updatedAt = source.updatedAt.toISOString();
  }

  static of(source: SessionSource): GetFieldVotingSessionResponse {
    return new GetFieldVotingSessionResponse(source);
  }
}
