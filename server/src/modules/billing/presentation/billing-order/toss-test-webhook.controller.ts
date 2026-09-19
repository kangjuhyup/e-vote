import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../shared/presentation/common/decorator/public.decorator';
import { ProcessTossTestWebhookHandler } from '../../application/command/handler/process-toss-test-webhook.handler';
import { TossPaymentStatusWebhookBody } from './dto/toss-payment-status-webhook-request.dto';
import { throwMappedBillingError } from './billing-error.mapper';

@Public()
@ApiTags('billing')
@Controller('billing/toss-test-webhook')
export class TossTestWebhookController {
  constructor(private readonly handler: ProcessTossTestWebhookHandler) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토스페이먼츠 테스트 결제 웹훅' })
  async receive(@Body() body: TossPaymentStatusWebhookBody): Promise<void> {
    try {
      await this.handler.execute({
        eventType: body.eventType,
        paymentKey: body.data.paymentKey,
      });
    } catch (error) {
      throwMappedBillingError(error);
    }
  }
}
