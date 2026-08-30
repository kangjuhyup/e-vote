import { ApiProperty } from '@nestjs/swagger';

export class AttachElectoralRollSnapshotBody {
  @ApiProperty() readonly snapshotId!: string;
}
