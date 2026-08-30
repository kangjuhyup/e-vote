import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GetElectoralRollPageQuery as GetElectoralRollPageApplicationQuery } from '../../application/query/dto/request/get-electoral-roll-page.query';
import { GetElectoralRollQuery } from '../../application/query/dto/request/get-electoral-roll.query';
import { GetElectoralRollPageHandler } from '../../application/query/handler/get-electoral-roll-page.handler';
import { GetElectoralRollHandler } from '../../application/query/handler/get-electoral-roll.handler';
import { throwMappedElectoralRollError } from './electoral-roll-error.mapper';
import { GetElectoralRollPageQuery as GetElectoralRollPageRequestQuery } from './dto/get-electoral-roll-page-request.dto';
import { GetElectoralRollPageResponse } from './dto/get-electoral-roll-page-response.dto';
import { GetElectoralRollResponse } from './dto/get-electoral-roll-response.dto';
import { ElectoralRollParam } from './dto/manage-electoral-roll-member-request.dto';

@ApiTags('electoral-rolls')
@Controller('electoral-rolls')
export class ElectoralRollReadController {
  constructor(
    private readonly handler: GetElectoralRollHandler,
    private readonly pageHandler: GetElectoralRollPageHandler,
  ) {}

  @Get()
  @ApiOperation({
    summary: '선거인명부 페이지 조회',
    description:
      '인증 사용자가 활성 위원으로 등록된 선거관리위원회의 명부 메타데이터만 조회합니다. 명부 구성원의 식별정보는 반환하지 않습니다.',
  })
  @ApiQuery({ name: 'commissionId', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiOkResponse({ type: GetElectoralRollPageResponse })
  @ApiUnauthorizedResponse({
    description: '검증된 UserPrincipal이 요청에 없습니다.',
  })
  async getElectoralRollPage(
    @User() user: UserPrincipal,
    @Query() query: GetElectoralRollPageRequestQuery,
  ): Promise<GetElectoralRollPageResponse> {
    return GetElectoralRollPageResponse.of(
      await this.pageHandler.execute(
        GetElectoralRollPageApplicationQuery.of({
          userPrincipalId: user.id,
          commissionId: query.commissionId,
          query: query.q,
          page: Number(query.page),
          pageSize: Number(query.pageSize),
        }),
      ),
    );
  }

  @Get(':electoralRollId')
  @ApiOkResponse({ type: GetElectoralRollResponse })
  async getElectoralRoll(
    @User() user: UserPrincipal,
    @Param() params: ElectoralRollParam,
  ): Promise<GetElectoralRollResponse> {
    try {
      return GetElectoralRollResponse.of(
        await this.handler.execute(GetElectoralRollQuery.of(params)),
      );
    } catch (error) {
      throwMappedElectoralRollError(error);
    }
  }
}
