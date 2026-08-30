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
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GetElectionCommissionPageHandler } from '../../../application/query/handler/get-election-commission-page.handler';
import {
  ElectionCommissionNotFoundError,
  GetElectionCommissionHandler,
} from '../../../application/query/handler/get-election-commission.handler';
import { GetElectionCommissionPageQuery as GetElectionCommissionPageApplicationQuery } from '../../../application/query/get-election-commission-page.query';
import { GetElectionCommissionQuery } from '../../../application/query/get-election-commission.query';
import { GetElectionCommissionPageQuery as GetElectionCommissionPageRequestQuery } from './dto/get-election-commission-page-request.dto';
import { GetElectionCommissionPageResponse } from './dto/get-election-commission-page-response.dto';
import { GetElectionCommissionParam } from './dto/get-election-commission-request.dto';
import { GetElectionCommissionResponse } from './dto/get-election-commission-response.dto';

@ApiTags('election-commissions')
@Controller('election-commissions')
export class ElectionCommissionReadController {
  constructor(
    private readonly getElectionCommissionHandler: GetElectionCommissionHandler,
    private readonly getElectionCommissionPageHandler: GetElectionCommissionPageHandler,
  ) {}

  @Get()
  @ApiOperation({
    summary: '선거관리위원회 페이지 조회',
    description: '선거관리위원회 목록을 페이지 단위로 조회합니다.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: '조회할 페이지 번호입니다. 생략하면 1입니다.',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    example: 20,
    description:
      '페이지당 선거관리위원회 수입니다. 생략하면 20이고 최대 100입니다.',
  })
  @ApiOkResponse({
    type: GetElectionCommissionPageResponse,
    description: '선거관리위원회 페이지 조회 결과입니다.',
  })
  async getElectionCommissionPage(
    @Query() query: GetElectionCommissionPageRequestQuery,
  ): Promise<GetElectionCommissionPageResponse> {
    const result = await this.getElectionCommissionPageHandler.execute(
      GetElectionCommissionPageApplicationQuery.of({
        page: Number(query.page),
        pageSize: Number(query.pageSize),
      }),
    );

    return GetElectionCommissionPageResponse.of(result);
  }

  @Get(':commissionId')
  @ApiOperation({
    summary: '선거관리위원회 상세 조회',
    description: '등록된 위원 목록을 포함해 선거관리위원회를 조회합니다.',
  })
  @ApiParam({
    name: 'commissionId',
    example: 'commission-1',
    description: '상세 조회할 선거관리위원회 ID입니다.',
  })
  @ApiOkResponse({
    type: GetElectionCommissionResponse,
    description: '선거관리위원회 상세 조회 결과입니다.',
  })
  @ApiNotFoundResponse({
    description: '선거관리위원회를 찾을 수 없습니다.',
  })
  async getElectionCommission(
    @Param() params: GetElectionCommissionParam,
  ): Promise<GetElectionCommissionResponse> {
    try {
      const result = await this.getElectionCommissionHandler.execute(
        GetElectionCommissionQuery.of({
          commissionId: params.commissionId,
        }),
      );

      return GetElectionCommissionResponse.of(result);
    } catch (error) {
      if (error instanceof ElectionCommissionNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
