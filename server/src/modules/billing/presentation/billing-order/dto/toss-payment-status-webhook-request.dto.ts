import { Type } from 'class-transformer';
import {
  Equals,
  IsDateString,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// The provider sends a full Payment object. We validate only the fields this
// endpoint needs; all state and amount decisions use a fresh provider query.
export class TossWebhookPaymentBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  paymentKey!: string;
}

export class TossPaymentStatusWebhookBody {
  @Equals('PAYMENT_STATUS_CHANGED')
  eventType!: 'PAYMENT_STATUS_CHANGED';

  @IsDateString()
  createdAt!: string;

  @ValidateNested()
  @Type(() => TossWebhookPaymentBody)
  data!: TossWebhookPaymentBody;
}
