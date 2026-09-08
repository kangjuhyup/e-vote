import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetSmsDispatchPageQuery as ApplicationPageQuery } from '../../application/query/dto/request/get-sms-dispatch-page.query';
import { GetSmsDispatchQuery as ApplicationDetailQuery } from '../../application/query/dto/request/get-sms-dispatch.query';
import { GetSmsDispatchPageHandler } from '../../application/query/handler/get-sms-dispatch-page.handler';
import {
  GetSmsDispatchHandler,
  SmsDispatchNotFoundError,
} from '../../application/query/handler/get-sms-dispatch.handler';
import {
  GetSmsDispatchPageParam,
  GetSmsDispatchPageQuery,
  GetSmsDispatchParam,
  GetSmsDispatchQuery,
} from './dto/get-sms-dispatch-request.dto';
import {
  GetSmsDispatchPageResponse,
  GetSmsDispatchResponse,
} from './dto/get-sms-dispatch-response.dto';

@ApiTags('vote-sms')
@Controller('votes/:voteId/sms/dispatches')
export class VoteSmsReadController {
  constructor(
    private readonly getPageHandler: GetSmsDispatchPageHandler,
    private readonly getHandler: GetSmsDispatchHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: '문자 발송 요약 목록 조회' })
  @ApiOkResponse({ type: GetSmsDispatchPageResponse })
  async getSmsDispatchPage(
    @User() user: UserPrincipal,
    @Param() params: GetSmsDispatchPageParam,
    @Query() query: GetSmsDispatchPageQuery,
  ): Promise<GetSmsDispatchPageResponse> {
    const result = await this.getPageHandler.execute(
      ApplicationPageQuery.of({
        voteId: params.voteId,
        page: Number(query.page),
        pageSize: Number(query.pageSize),
      }),
    );
    return GetSmsDispatchPageResponse.of(result);
  }

  @Get(':smsDispatchId')
  @ApiOperation({ summary: '문자 발송 상세 조회' })
  @ApiOkResponse({ type: GetSmsDispatchResponse })
  @ApiNotFoundResponse({ description: '문자 발송 이력을 찾을 수 없습니다.' })
  async getSmsDispatch(
    @User() user: UserPrincipal,
    @Param() params: GetSmsDispatchParam,
    @Query() query: GetSmsDispatchQuery,
  ): Promise<GetSmsDispatchResponse> {
    try {
      const result = await this.getHandler.execute(
        ApplicationDetailQuery.of({
          voteId: params.voteId,
          smsDispatchId: params.smsDispatchId,
          page: Number(query.page),
          pageSize: Number(query.pageSize),
        }),
      );
      return GetSmsDispatchResponse.of(result);
    } catch (error) {
      if (error instanceof SmsDispatchNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
