import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class BillingOrderParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  })
  readonly billingOrderId!: string;
}
