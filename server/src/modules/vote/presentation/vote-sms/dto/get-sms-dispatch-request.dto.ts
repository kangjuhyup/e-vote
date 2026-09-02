import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetSmsDispatchPageParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly voteId!: string;
}

export class GetSmsDispatchPageQuery {
  @ApiProperty({ required: false, minimum: 1, default: 1 })
  readonly page?: string;
  @ApiProperty({ required: false, minimum: 1, maximum: 100, default: 20 })
  readonly pageSize?: string;
}

export class GetSmsDispatchParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly voteId!: string;

  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly smsDispatchId!: string;
}
