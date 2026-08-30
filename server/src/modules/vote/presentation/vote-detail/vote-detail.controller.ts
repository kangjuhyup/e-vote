import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateVoteDetailCommand } from '../../application/command/dto/request/create-vote-detail.command';
import { CreateVoteDetailHandler } from '../../application/command/handler/create-vote-detail.handler';
import {
  CreateVoteDetailBody,
  CreateVoteDetailParam,
} from './dto/create-vote-detail-request.dto';
import { CreateVoteDetailResponse } from './dto/create-vote-detail-response.dto';
import { ChangeVoteDetailStatusCommand } from '../../application/command/dto/request/change-vote-detail-status.command';
import { UpdateVoteDetailCommand } from '../../application/command/dto/request/update-vote-detail.command';
import { ChangeVoteDetailStatusHandler } from '../../application/command/handler/change-vote-detail-status.handler';
import { UpdateVoteDetailHandler } from '../../application/command/handler/update-vote-detail.handler';
import {
  ChangeVoteDetailStatusBody,
  ManageVoteDetailParam,
  UpdateVoteDetailBody,
} from './dto/manage-vote-detail-request.dto';
import { ManageVoteDetailResponse } from './dto/manage-vote-detail-response.dto';

@ApiTags('vote-details')
@Controller('votes/:voteId/sub-votes')
export class VoteDetailController {
  constructor(
    private readonly createVoteDetailHandler: CreateVoteDetailHandler,
    private readonly updateVoteDetailHandler?: UpdateVoteDetailHandler,
    private readonly changeVoteDetailStatusHandler?: ChangeVoteDetailStatusHandler,
  ) {}

  @Put()
  @HttpCode(201)
  @ApiOperation({
    summary: '자식 투표 생성',
    description: '부모 투표 아래에 자식 투표 항목을 초안 상태로 생성합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiBody({
    type: CreateVoteDetailBody,
    description: '생성할 자식 투표 정보입니다.',
  })
  @ApiCreatedResponse({
    type: CreateVoteDetailResponse,
    description: '자식 투표 생성 결과입니다.',
  })
  async createVoteDetail(
    @Param() params: CreateVoteDetailParam,
    @Body() body: CreateVoteDetailBody,
  ): Promise<CreateVoteDetailResponse> {
    const result = await this.createVoteDetailHandler.execute(
      CreateVoteDetailCommand.of({
        voteId: params.voteId,
        title: body.title,
        type: body.type,
        sortOrder: body.sortOrder,
        overrides: body.overrides,
      }),
    );

    return CreateVoteDetailResponse.of(result);
  }

  @Patch(':voteDetailId')
  async updateVoteDetail(
    @Param() params: ManageVoteDetailParam,
    @Body() body: UpdateVoteDetailBody,
  ) {
    return ManageVoteDetailResponse.of(
      await this.updateVoteDetailHandler!.execute(
        UpdateVoteDetailCommand.of({ ...params, ...body }),
      ),
    );
  }

  @Post(':voteDetailId/open')
  @HttpCode(200)
  async openVoteDetail(
    @Param() params: ManageVoteDetailParam,
    @Body() body: ChangeVoteDetailStatusBody,
  ) {
    return ManageVoteDetailResponse.of(
      await this.changeVoteDetailStatusHandler!.execute(
        ChangeVoteDetailStatusCommand.of({
          ...params,
          action: 'open',
          changedAt: new Date(body.changedAt),
        }),
      ),
    );
  }

  @Post(':voteDetailId/close')
  @HttpCode(200)
  async closeVoteDetail(
    @Param() params: ManageVoteDetailParam,
    @Body() body: ChangeVoteDetailStatusBody,
  ) {
    return ManageVoteDetailResponse.of(
      await this.changeVoteDetailStatusHandler!.execute(
        ChangeVoteDetailStatusCommand.of({
          ...params,
          action: 'close',
          changedAt: new Date(body.changedAt),
        }),
      ),
    );
  }

  @Delete(':voteDetailId')
  async deleteVoteDetail(@Param() params: ManageVoteDetailParam) {
    return ManageVoteDetailResponse.of(
      await this.changeVoteDetailStatusHandler!.execute(
        ChangeVoteDetailStatusCommand.of({
          ...params,
          action: 'cancel',
          changedAt: new Date(),
        }),
      ),
    );
  }
}
