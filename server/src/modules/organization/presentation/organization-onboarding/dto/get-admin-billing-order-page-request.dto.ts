import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetAdminBillingOrderPageQuery {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional()
  @IsIn(['PENDING_PAYMENT', 'PAID', 'CANCELED', 'REFUND_PENDING', 'REFUNDED'])
  status?: string;
}
