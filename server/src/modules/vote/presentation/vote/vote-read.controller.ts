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
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GetVotePageHandler } from '../../application/query/handler/get-vote-page.handler';
import { GetVotePageQuery as GetVotePageApplicationQuery } from '../../application/query/dto/request/get-vote-page.query';
import {
  GetVoteHandler,
  VoteNotFoundError,
} from '../../application/query/handler/get-vote.handler';
import { GetVoteQuery } from '../../application/query/dto/request/get-vote.query';
import { GetVotePageQuery as GetVotePageRequestQuery } from './dto/get-vote-page-request.dto';
import { GetVotePageResponse } from './dto/get-vote-page-response.dto';
import { GetVoteParam } from './dto/get-vote-request.dto';
import { GetVoteResponse } from './dto/get-vote-response.dto';
import { VoteOrganizationProtected } from '../../../../shared/presentation/common/decorator/vote-organization-protected.decorator';

@ApiTags('votes')
@Controller('votes')
@VoteOrganizationProtected()
export class VoteReadController {
  constructor(
    private readonly getVoteHandler: GetVoteHandler,
    private readonly getVotePageHandler: GetVotePageHandler,
  ) {}

  @Get()
  @ApiOperation({
    summary: '부모 투표 페이지 조회',
    description: '부모 투표 목록을 페이지 단위로 조회합니다.',
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
    description: '페이지당 투표 수입니다. 생략하면 20이고 최대 100입니다.',
  })
  @ApiOkResponse({
    type: GetVotePageResponse,
    description: '부모 투표 페이지 조회 결과입니다.',
  })
  async getVotePage(
    @User() user: UserPrincipal,
    @Query() query: GetVotePageRequestQuery,
  ): Promise<GetVotePageResponse> {
    const result = await this.getVotePageHandler.execute(
      GetVotePageApplicationQuery.of({
        page: Number(query.page),
        pageSize: Number(query.pageSize),
        userPrincipalId: user.id,
        tenantId: user.tenantId,
        organizationGroupIds: user
          .managedOrganizations()
          .map((item) => item.id),
        voteAdmin: user.roles.includes('vote-admin'),
      }),
    );

    return GetVotePageResponse.of(result);
  }

  @Get(':voteId')
  @ApiOperation({
    summary: '부모 투표 전체 상세 조회',
    description: '부모 투표와 자식 투표, 후보 정보를 함께 조회합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '상세 조회할 부모 투표 ID입니다.',
  })
  @ApiOkResponse({
    type: GetVoteResponse,
    description: '부모 투표 전체 상세 조회 결과입니다.',
  })
  @ApiNotFoundResponse({
    description: '부모 투표를 찾을 수 없습니다.',
  })
  async getVote(
    @User() user: UserPrincipal,
    @Param() params: GetVoteParam,
  ): Promise<GetVoteResponse> {
    try {
      const result = await this.getVoteHandler.execute(
        GetVoteQuery.of({
          voteId: params.voteId,
          userPrincipalId: user.id,
          tenantId: user.tenantId,
          organizationGroupIds: user
            .managedOrganizations()
            .map((item) => item.id),
          voteAdmin: user.roles.includes('vote-admin'),
        }),
      );

      return GetVoteResponse.of(result);
    } catch (error) {
      if (error instanceof VoteNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
