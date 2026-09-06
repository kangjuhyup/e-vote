import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
import type { CreateVoteBody } from './create-vote-request.dto';

export class UpdateVoteBody {
  @ApiProperty() readonly title!: CreateVoteBody['title'];
  @ApiProperty({ isArray: true })
  readonly votingChannels!: CreateVoteBody['votingChannels'];
  @ApiProperty() readonly defaultPolicy!: CreateVoteBody['defaultPolicy'];
  @ApiProperty()
  readonly identityVerificationPolicy!: CreateVoteBody['identityVerificationPolicy'];

  @IsOptional()
  @IsISO8601({ strict: true })
  @ApiProperty({ required: false, format: 'date-time' })
  readonly startedAt?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @ApiProperty({ required: false, format: 'date-time' })
  readonly endedAt?: string;
}

export class ChangeVoteStatusBody {
  @ApiProperty({ format: 'date-time' }) readonly changedAt!: string;
}
