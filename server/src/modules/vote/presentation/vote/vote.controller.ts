import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateVoteCommand } from '../../application/command/dto/request/create-vote.command';
import { CreateVoteHandler } from '../../application/command/handler/create-vote.handler';
import { CreateVoteBody } from './dto/create-vote-request.dto';
import { CreateVoteResponse } from './dto/create-vote-response.dto';
import { ChangeVoteStatusCommand } from '../../application/command/dto/request/change-vote-status.command';
import { UpdateVoteCommand } from '../../application/command/dto/request/update-vote.command';
import { ChangeVoteStatusHandler } from '../../application/command/handler/change-vote-status.handler';
import { UpdateVoteHandler } from '../../application/command/handler/update-vote.handler';
import { VoteParam } from './dto/create-vote-request.dto';
import {
  ChangeVoteStatusBody,
  UpdateVoteBody,
} from './dto/manage-vote-request.dto';
import { ManageVoteResponse } from './dto/manage-vote-response.dto';
import { AttachElectoralRollSnapshotCommand } from '../../application/command/dto/request/attach-electoral-roll-snapshot.command';
import { AttachElectoralRollSnapshotHandler } from '../../application/command/handler/attach-electoral-roll-snapshot.handler';
import { throwMappedVoteElectoralRollError } from './vote-electoral-roll-error.mapper';
import { AttachElectoralRollSnapshotBody } from './dto/attach-electoral-roll-snapshot-request.dto';
import { AttachElectoralRollSnapshotResponse } from './dto/attach-electoral-roll-snapshot-response.dto';

@ApiTags('votes')
@Controller('votes')
export class VoteController {
  constructor(
    private readonly createVoteHandler: CreateVoteHandler,
    private readonly updateVoteHandler?: UpdateVoteHandler,
    private readonly changeVoteStatusHandler?: ChangeVoteStatusHandler,
    private readonly attachElectoralRollSnapshotHandler?: AttachElectoralRollSnapshotHandler,
  ) {}

  @Post()
  @ApiOperation({
    summary: '부모 투표 생성',
    description: '부모 투표를 초안 상태로 생성합니다.',
  })
  @ApiBody({
    type: CreateVoteBody,
    description: '생성할 부모 투표 정보입니다.',
  })
  @ApiCreatedResponse({
    type: CreateVoteResponse,
    description: '부모 투표 생성 결과입니다.',
  })
  async createVote(
    @User() user: UserPrincipal,
    @Body() body: CreateVoteBody,
  ): Promise<CreateVoteResponse> {
    const result = await this.createVoteHandler.execute(
      CreateVoteCommand.of({
        createdByUserPrincipalId: user.id,
        commissionId: body.commissionId,
        title: body.title,
        votingChannels: body.votingChannels,
        defaultPolicy: body.defaultPolicy,
        identityVerificationPolicy: body.identityVerificationPolicy,
      }),
    );

    return CreateVoteResponse.of(result);
  }

  @Put(':voteId/electoral-roll-snapshot')
  @ApiOkResponse({ type: AttachElectoralRollSnapshotResponse })
  async attachElectoralRollSnapshot(
    @User() user: UserPrincipal,
    @Param() params: VoteParam,
    @Body() body: AttachElectoralRollSnapshotBody,
  ): Promise<AttachElectoralRollSnapshotResponse> {
    try {
      return AttachElectoralRollSnapshotResponse.of(
        await this.attachElectoralRollSnapshotHandler!.execute(
          AttachElectoralRollSnapshotCommand.of({
            userPrincipalId: user.id,
            voteId: params.voteId,
            electoralRollId: body.electoralRollId,
            requestedAt: new Date(),
          }),
        ),
      );
    } catch (error) {
      throwMappedVoteElectoralRollError(error);
    }
  }

  @Patch(':voteId')
  async updateVote(
    @User() user: UserPrincipal,
    @Param() params: VoteParam,
    @Body() body: UpdateVoteBody,
  ) {
    return ManageVoteResponse.of(
      await this.updateVoteHandler!.execute(
        UpdateVoteCommand.of({ voteId: params.voteId, ...body }),
      ),
    );
  }

  @Post(':voteId/open')
  @HttpCode(200)
  async openVote(
    @User() user: UserPrincipal,
    @Param() params: VoteParam,
    @Body() body: ChangeVoteStatusBody,
  ) {
    return ManageVoteResponse.of(
      await this.changeVoteStatusHandler!.execute(
        ChangeVoteStatusCommand.of({
          voteId: params.voteId,
          action: 'open',
          changedAt: new Date(body.changedAt),
        }),
      ),
    );
  }

  @Post(':voteId/close')
  @HttpCode(200)
  async closeVote(
    @User() user: UserPrincipal,
    @Param() params: VoteParam,
    @Body() body: ChangeVoteStatusBody,
  ) {
    return ManageVoteResponse.of(
      await this.changeVoteStatusHandler!.execute(
        ChangeVoteStatusCommand.of({
          voteId: params.voteId,
          action: 'close',
          changedAt: new Date(body.changedAt),
        }),
      ),
    );
  }

  @Delete(':voteId')
  async deleteVote(@User() user: UserPrincipal, @Param() params: VoteParam) {
    return ManageVoteResponse.of(
      await this.changeVoteStatusHandler!.execute(
        ChangeVoteStatusCommand.of({
          voteId: params.voteId,
          action: 'cancel',
          changedAt: new Date(),
        }),
      ),
    );
  }
}
