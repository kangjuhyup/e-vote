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
import { GetElectorPageHandler } from '../../../application/query/handler/get-elector-page.handler';
import { GetElectorPageQuery as GetElectorPageApplicationQuery } from '../../../application/query/get-elector-page.query';
import {
  ElectorNotFoundError,
  GetElectorHandler,
} from '../../../application/query/handler/get-elector.handler';
import { GetElectorQuery } from '../../../application/query/get-elector.query';
import { GetElectorPageQuery as GetElectorPageRequestQuery } from './dto/get-elector-page-request.dto';
import { GetElectorPageResponse } from './dto/get-elector-page-response.dto';
import { GetElectorParam } from './dto/get-elector-request.dto';
import { GetElectorResponse } from './dto/get-elector-response.dto';

@ApiTags('electors')
@Controller('votes/:voteId/electors')
export class ElectorReadController {
  constructor(
    private readonly getElectorHandler: GetElectorHandler,
    private readonly getElectorPageHandler: GetElectorPageHandler,
  ) {}

  @Get()
  @ApiOperation({
    summary: '선거인 페이지 조회',
    description: '부모 투표에 등록된 선거인 목록을 페이지 단위로 조회합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '선거인이 속한 부모 투표 ID입니다.',
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
    description: '페이지당 선거인 수입니다. 생략하면 20이고 최대 100입니다.',
  })
  @ApiOkResponse({
    type: GetElectorPageResponse,
    description: '선거인 페이지 조회 결과입니다.',
  })
  async getElectorPage(
    @Param() params: Pick<GetElectorParam, 'voteId'>,
    @Query() query: GetElectorPageRequestQuery,
  ): Promise<GetElectorPageResponse> {
    const result = await this.getElectorPageHandler.execute(
      GetElectorPageApplicationQuery.of({
        voteId: params.voteId,
        page: Number(query.page),
        pageSize: Number(query.pageSize),
      }),
    );

    return GetElectorPageResponse.of(result);
  }

  @Get(':electorId')
  @ApiOperation({
    summary: '선거인 상세 조회',
    description: '부모 투표에 등록된 단일 선거인을 조회합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '선거인이 속한 부모 투표 ID입니다.',
  })
  @ApiParam({
    name: 'electorId',
    example: 'elector-1',
    description: '조회할 선거인 ID입니다.',
  })
  @ApiOkResponse({
    type: GetElectorResponse,
    description: '선거인 상세 조회 결과입니다.',
  })
  @ApiNotFoundResponse({
    description: '선거인을 찾을 수 없습니다.',
  })
  async getElector(
    @Param() params: GetElectorParam,
  ): Promise<GetElectorResponse> {
    try {
      const result = await this.getElectorHandler.execute(
        GetElectorQuery.of({
          voteId: params.voteId,
          electorId: params.electorId,
        }),
      );

      return GetElectorResponse.of(result);
    } catch (error) {
      if (error instanceof ElectorNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
