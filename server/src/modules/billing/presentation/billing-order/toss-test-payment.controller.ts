import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { ConfirmTossTestPaymentHandler } from '../../application/command/handler/confirm-toss-test-payment.handler';
import { throwMappedBillingError } from './billing-error.mapper';
import { BillingOrderParam } from './dto/billing-order-request.dto';
import { BillingOrderResponse } from './dto/billing-order-response.dto';
import { ConfirmTossTestPaymentBody } from './dto/confirm-toss-test-payment-request.dto';

@ApiTags('billing')
@Controller('billing/vote-usage-orders')
export class TossTestPaymentController {
  constructor(private readonly confirmHandler: ConfirmTossTestPaymentHandler) {}

  @Post(':billingOrderId/toss-test-confirmation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토스페이먼츠 테스트 결제 승인' })
  async confirm(
    @User() user: UserPrincipal,
    @Param() params: BillingOrderParam,
    @Body() body: ConfirmTossTestPaymentBody,
  ): Promise<BillingOrderResponse> {
    try {
      return BillingOrderResponse.of(
        await this.confirmHandler.execute({
          billingOrderId: params.billingOrderId,
          userPrincipalId: user.id,
          paymentKey: body.paymentKey,
          orderId: body.orderId,
          amount: body.amount,
        }),
      );
    } catch (error) {
      throwMappedBillingError(error);
    }
  }
}
