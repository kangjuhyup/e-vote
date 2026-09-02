import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ManageCandidateParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly voteId!: string;

  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly voteDetailId!: string;

  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly candidateId!: string;
}

export class UpdateCandidateBody {
  @ApiProperty({ minimum: 1 }) readonly candidateNo!: number;
  @ApiProperty() readonly name!: string;
}
