import { ApiProperty } from '@nestjs/swagger';

type SnapshotSource = {
  readonly id: string;
  readonly electoralRollId: string;
  readonly sourceRevision: number;
  readonly memberCount: number;
  readonly contentHash: string;
  readonly createdAt: Date;
};

export class CreateElectoralRollSnapshotResponse {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly electoralRollId: string;
  @ApiProperty() readonly sourceRevision: number;
  @ApiProperty() readonly memberCount: number;
  @ApiProperty() readonly contentHash: string;
  @ApiProperty({ format: 'date-time' }) readonly createdAt: string;

  private constructor(source: SnapshotSource) {
    this.id = source.id;
    this.electoralRollId = source.electoralRollId;
    this.sourceRevision = source.sourceRevision;
    this.memberCount = source.memberCount;
    this.contentHash = source.contentHash;
    this.createdAt = source.createdAt.toISOString();
  }

  static of(source: SnapshotSource): CreateElectoralRollSnapshotResponse {
    return new CreateElectoralRollSnapshotResponse(source);
  }
}
