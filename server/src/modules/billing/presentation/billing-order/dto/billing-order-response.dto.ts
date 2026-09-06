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
  readonly baseAmount: number;
  readonly blockchainStorageCount: number;
  readonly blockchainStorageUnitPrice: number;
  readonly blockchainStorageAmount: number;
  readonly identityVerificationRequired: boolean;
  readonly identityVerificationUnitPrice: number;
  readonly identityVerificationAmount: number;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly paymentId?: string;
  readonly issuedAt: Date;
  readonly cancellationWindowDays: number;
  readonly cancelableUntil: Date;
  readonly paidAt?: Date;
  readonly canceledAt?: Date;
  readonly cancellationReason?: string;
  readonly refundRequestedAt?: Date;
  readonly refundedAt?: Date;
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
  @ApiProperty({ example: 6000 }) readonly baseAmount: number;
  @ApiProperty({ example: 2 }) readonly blockchainStorageCount: number;
  @ApiProperty({ example: 3000 }) readonly blockchainStorageUnitPrice: number;
  @ApiProperty({ example: 6000 }) readonly blockchainStorageAmount: number;
  @ApiProperty({ example: true })
  readonly identityVerificationRequired: boolean;
  @ApiProperty({ example: 30000 })
  readonly identityVerificationUnitPrice: number;
  @ApiProperty({ example: 60000 }) readonly identityVerificationAmount: number;
  @ApiProperty({ example: 72000 }) readonly amount: number;
  @ApiProperty({ example: 'KRW' }) readonly currency: string;
  @ApiProperty({
    enum: ['PENDING_PAYMENT', 'PAID', 'CANCELED', 'REFUND_PENDING', 'REFUNDED'],
  })
  readonly status: string;
  @ApiProperty({ required: false }) readonly paymentId?: string;
  @ApiProperty({ format: 'date-time' }) readonly issuedAt: string;
  @ApiProperty({ example: 7 }) readonly cancellationWindowDays: number;
  @ApiProperty({ format: 'date-time' }) readonly cancelableUntil: string;
  @ApiProperty({ format: 'date-time', required: false })
  readonly paidAt?: string;
  @ApiProperty({ format: 'date-time', required: false })
  readonly canceledAt?: string;
  @ApiProperty({ required: false }) readonly cancellationReason?: string;
  @ApiProperty({ format: 'date-time', required: false })
  readonly refundRequestedAt?: string;
  @ApiProperty({ format: 'date-time', required: false })
  readonly refundedAt?: string;

  private constructor(source: BillingOrderResponseSource) {
    this.id = source.id;
    this.voteId = source.voteId;
    this.productCode = source.productCode;
    this.productName = source.productName;
    this.electorCount = source.electorCount;
    this.pricingUnitSize = source.pricingUnitSize;
    this.pricingUnitCount = source.pricingUnitCount;
    this.unitPrice = source.unitPrice;
    this.baseAmount = source.baseAmount;
    this.blockchainStorageCount = source.blockchainStorageCount;
    this.blockchainStorageUnitPrice = source.blockchainStorageUnitPrice;
    this.blockchainStorageAmount = source.blockchainStorageAmount;
    this.identityVerificationRequired = source.identityVerificationRequired;
    this.identityVerificationUnitPrice = source.identityVerificationUnitPrice;
    this.identityVerificationAmount = source.identityVerificationAmount;
    this.amount = source.amount;
    this.currency = source.currency;
    this.status = source.status;
    if (source.paymentId !== undefined) this.paymentId = source.paymentId;
    this.issuedAt = source.issuedAt.toISOString();
    this.cancellationWindowDays = source.cancellationWindowDays;
    this.cancelableUntil = source.cancelableUntil.toISOString();
    if (source.paidAt !== undefined) this.paidAt = source.paidAt.toISOString();
    if (source.canceledAt !== undefined) {
      this.canceledAt = source.canceledAt.toISOString();
    }
    if (source.cancellationReason !== undefined) {
      this.cancellationReason = source.cancellationReason;
    }
    if (source.refundRequestedAt !== undefined) {
      this.refundRequestedAt = source.refundRequestedAt.toISOString();
    }
    if (source.refundedAt !== undefined) {
      this.refundedAt = source.refundedAt.toISOString();
    }
  }

  static of(source: BillingOrderResponseSource): BillingOrderResponse {
    return new BillingOrderResponse(source);
  }
}
