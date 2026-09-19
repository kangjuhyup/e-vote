import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class ConfirmTossTestPaymentBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  paymentKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  orderId!: string;

  @IsInt()
  @IsPositive()
  amount!: number;
}
