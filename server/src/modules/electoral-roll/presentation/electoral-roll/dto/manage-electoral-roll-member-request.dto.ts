import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ElectoralRollParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly electoralRollId!: string;
}

export class ElectoralRollMemberParam extends ElectoralRollParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly memberId!: string;
}

export class UpdateElectoralRollMemberBody {
  @ApiProperty({ example: 'member-1' }) readonly identifier!: string;
  @ApiProperty({ required: false, example: 'group-1' })
  readonly groupKey?: string;
  @ApiProperty({ example: 1, minimum: 0.000001 }) readonly voteWeight!: number;
  @ApiProperty({ required: false, example: '홍길동' }) readonly name?: string;
  @ApiProperty({ required: false, example: '010-1234-5678' })
  readonly phoneNumber?: string;
  @ApiProperty({ required: false, example: '1990-01-02', format: 'date' })
  readonly birthDate?: string;
}
