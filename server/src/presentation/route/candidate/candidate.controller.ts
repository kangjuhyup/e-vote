import { Body, Controller, HttpCode, Param, Put } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCandidateCommand } from '../../../application/command/create-candidate.command';
import { CreateCandidateHandler } from '../../../application/command/create-candidate.handler';
import {
  CreateCandidateBody,
  CreateCandidateParam,
} from './dto/create-candidate-request.dto';
import { CreateCandidateResponse } from './dto/create-candidate-response.dto';

@ApiTags('candidates')
@Controller('votes/:voteId/sub-votes/:voteDetailId/candidates')
export class CandidateController {
  constructor(
    private readonly createCandidateHandler: CreateCandidateHandler,
  ) {}

  @Put()
  @HttpCode(201)
  @ApiOperation({
    summary: '후보 생성',
    description: '자식 투표에 후보를 등록합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiParam({
    name: 'voteDetailId',
    example: 'vote-detail-1',
    description: '후보가 속할 자식 투표 ID입니다.',
  })
  @ApiBody({
    type: CreateCandidateBody,
    description: '생성할 후보 정보입니다.',
  })
  @ApiCreatedResponse({
    type: CreateCandidateResponse,
    description: '후보 생성 결과입니다.',
  })
  async createCandidate(
    @Param() params: CreateCandidateParam,
    @Body() body: CreateCandidateBody,
  ): Promise<CreateCandidateResponse> {
    const result = await this.createCandidateHandler.execute(
      CreateCandidateCommand.of({
        voteDetailId: params.voteDetailId,
        candidateNo: body.candidateNo,
        name: body.name,
      }),
    );

    return CreateCandidateResponse.of(result);
  }
}
