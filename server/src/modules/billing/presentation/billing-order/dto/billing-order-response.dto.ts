import { ApiProperty } from '@nestjs/swagger';
type BillingOrderResponseSource = {
  readonly id: string;
  readonly voteId: string;
  readonly productCode: string;
  readonly productName: string;
  readonly electorCount: number;
  readonly pricingUnitSize: number;
  readonly pricingUnitCount: number;
  readonly unitPrice: number;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly paymentId?: string;
  readonly issuedAt: Date;
  readonly paidAt?: Date;
};

export class BillingOrderResponse {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly voteId: string;
  @ApiProperty() readonly productCode: string;
  @ApiProperty() readonly productName: string;
  @ApiProperty({ example: 120 }) readonly electorCount: number;
  @ApiProperty({ example: 100 }) readonly pricingUnitSize: number;
  @ApiProperty({ example: 2 }) readonly pricingUnitCount: number;
  @ApiProperty({ example: 3000 }) readonly unitPrice: number;
  @ApiProperty({ example: 6000 }) readonly amount: number;
  @ApiProperty({ example: 'KRW' }) readonly currency: string;
  @ApiProperty({ enum: ['PENDING_PAYMENT', 'PAID', 'REFUNDED'] })
  readonly status: string;
  @ApiProperty({ required: false }) readonly paymentId?: string;
  @ApiProperty({ format: 'date-time' }) readonly issuedAt: string;
  @ApiProperty({ format: 'date-time', required: false })
  readonly paidAt?: string;

  private constructor(source: BillingOrderResponseSource) {
    this.id = source.id;
    this.voteId = source.voteId;
    this.productCode = source.productCode;
    this.productName = source.productName;
    this.electorCount = source.electorCount;
    this.pricingUnitSize = source.pricingUnitSize;
    this.pricingUnitCount = source.pricingUnitCount;
    this.unitPrice = source.unitPrice;
    this.amount = source.amount;
    this.currency = source.currency;
    this.status = source.status;
    if (source.paymentId !== undefined) this.paymentId = source.paymentId;
    this.issuedAt = source.issuedAt.toISOString();
    if (source.paidAt !== undefined) this.paidAt = source.paidAt.toISOString();
  }

  static of(source: BillingOrderResponseSource): BillingOrderResponse {
    return new BillingOrderResponse(source);
  }
}
