import { ApiProperty } from '@nestjs/swagger';

type AttachSnapshotSource = {
  readonly voteId: string;
  readonly snapshotId: string;
  readonly memberCount: number;
};

export class AttachElectoralRollSnapshotResponse {
  @ApiProperty() readonly voteId: string;
  @ApiProperty() readonly snapshotId: string;
  @ApiProperty() readonly memberCount: number;

  private constructor(source: AttachSnapshotSource) {
    this.voteId = source.voteId;
    this.snapshotId = source.snapshotId;
    this.memberCount = source.memberCount;
  }

  static of(source: AttachSnapshotSource): AttachElectoralRollSnapshotResponse {
    return new AttachElectoralRollSnapshotResponse(source);
  }
}
