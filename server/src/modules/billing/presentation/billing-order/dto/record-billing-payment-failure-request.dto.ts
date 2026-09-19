import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class RecordBillingPaymentFailureBody {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{0,63}$/)
  failureCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  failureMessage?: string;
}
