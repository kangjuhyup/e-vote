import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { CreateVoteUsageBillingOrderCommand } from '../../application/command/dto/request/create-vote-usage-billing-order.command';
import { CreateVoteUsageBillingOrderHandler } from '../../application/command/handler/create-vote-usage-billing-order.handler';
import { GetBillingOrderQuery } from '../../application/query/dto/request/get-billing-order.query';
import { GetBillingOrderHandler } from '../../application/query/handler/get-billing-order.handler';
import { throwMappedBillingError } from './billing-error.mapper';
import { BillingOrderParam } from './dto/billing-order-request.dto';
import { BillingOrderResponse } from './dto/billing-order-response.dto';
import { CreateVoteUsageBillingOrderBody } from './dto/create-vote-usage-billing-order-request.dto';
import { GetBillingOrderResponse } from './dto/get-billing-order-response.dto';

@ApiTags('billing')
@Controller('billing/vote-usage-orders')
export class BillingOrderController {
  constructor(
    private readonly createHandler: CreateVoteUsageBillingOrderHandler,
    private readonly getHandler: GetBillingOrderHandler,
  ) {}

  @Post()
  @ApiOperation({
    summary: '투표 이용료 주문 생성',
    description:
      'ELIGIBLE 선거인 수를 기준으로 100명당 3,000원을 계산하고 가격 근거를 주문에 스냅샷으로 저장합니다. 같은 투표에 대한 재요청은 기존 주문을 반환합니다.',
  })
  @ApiCreatedResponse({ type: BillingOrderResponse })
  @ApiForbiddenResponse({ description: '투표 위원회 활성 위원이 아닙니다.' })
  async create(
    @User() user: UserPrincipal,
    @Body() body: CreateVoteUsageBillingOrderBody,
  ): Promise<BillingOrderResponse> {
    try {
      return BillingOrderResponse.of(
        await this.createHandler.execute(
          CreateVoteUsageBillingOrderCommand.of({
            voteId: body.voteId,
            orderedByUserPrincipalId: user.id,
            issuedAt: new Date(),
          }),
        ),
      );
    } catch (error) {
      throwMappedBillingError(error);
    }
  }

  @Get(':billingOrderId')
  @ApiOperation({ summary: '투표 이용료 주문 조회' })
  @ApiOkResponse({ type: GetBillingOrderResponse })
  @ApiForbiddenResponse({ description: '주문 위원회 활성 위원이 아닙니다.' })
  async get(
    @User() user: UserPrincipal,
    @Param() params: BillingOrderParam,
  ): Promise<GetBillingOrderResponse> {
    try {
      return GetBillingOrderResponse.of(
        await this.getHandler.execute(
          GetBillingOrderQuery.of({
            billingOrderId: params.billingOrderId,
            userPrincipalId: user.id,
          }),
        ),
      );
    } catch (error) {
      throwMappedBillingError(error);
    }
  }
}
