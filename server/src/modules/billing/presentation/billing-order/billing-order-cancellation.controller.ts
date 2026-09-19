import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { CancelVoteUsageBillingOrderCommand } from '../../application/command/dto/request/cancel-vote-usage-billing-order.command';
import { CancelVoteUsageBillingOrderHandler } from '../../application/command/handler/cancel-vote-usage-billing-order.handler';
import { throwMappedBillingError } from './billing-error.mapper';
import { BillingOrderParam } from './dto/billing-order-request.dto';
import { BillingOrderResponse } from './dto/billing-order-response.dto';
import { CancelVoteUsageBillingOrderBody } from './dto/cancel-vote-usage-billing-order-request.dto';

@ApiTags('billing')
@Controller('billing/vote-usage-orders')
export class BillingOrderCancellationController {
  constructor(
    private readonly cancelHandler: CancelVoteUsageBillingOrderHandler,
  ) {}

  @Post(':billingOrderId/cancellation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '투표 이용료 주문 및 확정 투표 취소',
    description:
      '투표 시작 전이면서 투표 예정 안내 문자가 발송되지 않았을 때 결제된 주문을 환불 요청할 수 있습니다. 미결제 주문은 시작 전이면서 주문 생성 후 7일 이내에 취소할 수 있습니다. 미결제 주문은 CANCELED, 결제된 주문은 REFUND_PENDING 상태가 됩니다.',
  })
  @ApiOkResponse({ type: BillingOrderResponse })
  @ApiNotFoundResponse({ description: '주문이 없습니다.' })
  @ApiForbiddenResponse({ description: '현재 사용자가 주문자가 아닙니다.' })
  @ApiConflictResponse({
    description:
      '안내 문자 발송, 미결제 주문 취소 기한 만료, 투표 시작 또는 취소할 수 없는 주문 상태',
  })
  async cancel(
    @User() user: UserPrincipal,
    @Param() params: BillingOrderParam,
    @Body() body: CancelVoteUsageBillingOrderBody,
  ): Promise<BillingOrderResponse> {
    if (typeof body?.reason !== 'string') {
      throw new BadRequestException('cancellation reason must be a string');
    }
    try {
      return BillingOrderResponse.of(
        await this.cancelHandler.execute(
          CancelVoteUsageBillingOrderCommand.of({
            billingOrderId: params.billingOrderId,
            userPrincipalId: user.id,
            reason: body.reason,
            canceledAt: new Date(),
          }),
        ),
      );
    } catch (error) {
      throwMappedBillingError(error);
    }
  }
}
