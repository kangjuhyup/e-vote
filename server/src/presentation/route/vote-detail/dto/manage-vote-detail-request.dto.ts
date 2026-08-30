import { ApiProperty } from '@nestjs/swagger';
import type { CreateVoteDetailBody } from './create-vote-detail-request.dto';

export class ManageVoteDetailParam {
  @ApiProperty() readonly voteId!: string;
  @ApiProperty() readonly voteDetailId!: string;
}

export class UpdateVoteDetailBody {
  @ApiProperty() readonly title!: CreateVoteDetailBody['title'];
  @ApiProperty() readonly type!: CreateVoteDetailBody['type'];
  @ApiProperty({ minimum: 0 }) readonly sortOrder!: number;
  @ApiProperty({ required: false })
  readonly overrides?: CreateVoteDetailBody['overrides'];
}

export class ChangeVoteDetailStatusBody {
  @ApiProperty({ format: 'date-time' }) readonly changedAt!: string;
}
