import { ApiProperty } from '@nestjs/swagger';

export class ManageCandidateParam {
  @ApiProperty() readonly voteId!: string;
  @ApiProperty() readonly voteDetailId!: string;
  @ApiProperty() readonly candidateId!: string;
}

export class UpdateCandidateBody {
  @ApiProperty({ minimum: 1 }) readonly candidateNo!: number;
  @ApiProperty() readonly name!: string;
}
