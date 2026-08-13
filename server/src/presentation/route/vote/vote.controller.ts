import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateVoteCommand } from '../../../application/command/create-vote.command';
import { CreateVoteHandler } from '../../../application/command/create-vote.handler';
import { CreateVoteBody } from './dto/create-vote-request.dto';
import { CreateVoteResponse } from './dto/create-vote-response.dto';

@ApiTags('votes')
@Controller('votes')
export class VoteController {
  constructor(private readonly createVoteHandler: CreateVoteHandler) {}

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
  async createVote(@Body() body: CreateVoteBody): Promise<CreateVoteResponse> {
    const result = await this.createVoteHandler.execute(
      CreateVoteCommand.of({
        commissionId: body.commissionId,
        title: body.title,
        votingChannels: body.votingChannels,
        defaultPolicy: body.defaultPolicy,
        identityVerificationPolicy: body.identityVerificationPolicy,
      }),
    );

    return CreateVoteResponse.of(result);
  }
}
