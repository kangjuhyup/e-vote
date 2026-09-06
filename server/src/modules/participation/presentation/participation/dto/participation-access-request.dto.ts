import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CastParticipationWithInvitationBody {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly voteDetailId!: string;

  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly selectedCandidateId!: string;
}
