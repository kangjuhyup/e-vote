import { ApiProperty } from '@nestjs/swagger';

export class GetSmsDispatchPageParam {
  @ApiProperty() readonly voteId!: string;
}

export class GetSmsDispatchPageQuery {
  @ApiProperty({ required: false, minimum: 1, default: 1 })
  readonly page?: string;
  @ApiProperty({ required: false, minimum: 1, maximum: 100, default: 20 })
  readonly pageSize?: string;
}

export class GetSmsDispatchParam {
  @ApiProperty() readonly voteId!: string;
  @ApiProperty() readonly smsDispatchId!: string;
}
