import { ApiProperty } from '@nestjs/swagger';
import type { CreateVoteBody } from './create-vote-request.dto';

export class UpdateVoteBody {
  @ApiProperty() readonly title!: CreateVoteBody['title'];
  @ApiProperty({ isArray: true })
  readonly votingChannels!: CreateVoteBody['votingChannels'];
  @ApiProperty() readonly defaultPolicy!: CreateVoteBody['defaultPolicy'];
  @ApiProperty()
  readonly identityVerificationPolicy!: CreateVoteBody['identityVerificationPolicy'];
}

export class ChangeVoteStatusBody {
  @ApiProperty({ format: 'date-time' }) readonly changedAt!: string;
}
