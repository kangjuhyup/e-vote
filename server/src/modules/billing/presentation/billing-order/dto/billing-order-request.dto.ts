import { ApiProperty } from '@nestjs/swagger';

export class BillingOrderParam {
  @ApiProperty({ example: 'billing-order-1' })
  readonly billingOrderId!: string;
}
