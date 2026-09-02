import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import type { CreateVoteDetailBody } from './create-vote-detail-request.dto';

export class ManageVoteDetailParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly voteId!: string;

  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly voteDetailId!: string;
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
