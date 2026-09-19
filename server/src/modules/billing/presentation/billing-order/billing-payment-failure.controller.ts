import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { RecordBillingPaymentFailureHandler } from '../../application/command/handler/record-billing-payment-failure.handler';
import { throwMappedBillingError } from './billing-error.mapper';
import { BillingOrderParam } from './dto/billing-order-request.dto';
import { RecordBillingPaymentFailureBody } from './dto/record-billing-payment-failure-request.dto';

@Controller('billing/vote-usage-orders')
export class BillingPaymentFailureController {
  constructor(private readonly handler: RecordBillingPaymentFailureHandler) {}

  @Post(':billingOrderId/payment-failure')
  @HttpCode(HttpStatus.NO_CONTENT)
  async record(
    @User() user: UserPrincipal,
    @Param() params: BillingOrderParam,
    @Body() body: RecordBillingPaymentFailureBody,
  ): Promise<void> {
    try {
      await this.handler.execute({
        billingOrderId: params.billingOrderId,
        userPrincipalId: user.id,
        failureCode: body.failureCode,
        failureMessage: body.failureMessage,
      });
    } catch (error) {
      throwMappedBillingError(error);
    }
  }
}
