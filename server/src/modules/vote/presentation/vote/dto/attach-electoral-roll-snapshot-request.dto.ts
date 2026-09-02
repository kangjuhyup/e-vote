import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AttachElectoralRollSnapshotBody {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly electoralRollId!: string;
}
