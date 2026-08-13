import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CastParticipationCommand } from '../../../application/command/cast-participation.command';
import { CastParticipationHandler } from '../../../application/command/cast-participation.handler';
import { RecordFieldParticipationEvidenceCommand } from '../../../application/command/record-field-participation-evidence.command';
import { RecordFieldParticipationEvidenceHandler } from '../../../application/command/record-field-participation-evidence.handler';
import { CastParticipationBody } from './dto/cast-participation-request.dto';
import { CastParticipationResponse } from './dto/cast-participation-response.dto';
import {
  RecordFieldParticipationEvidenceBody,
  RecordFieldParticipationEvidenceParam,
} from './dto/record-field-participation-evidence-request.dto';
import { RecordFieldParticipationEvidenceResponse } from './dto/record-field-participation-evidence-response.dto';

@ApiTags('participations')
@Controller('participations')
export class ParticipationController {
  constructor(
    private readonly castParticipationHandler: CastParticipationHandler,
    private readonly recordFieldParticipationEvidenceHandler: RecordFieldParticipationEvidenceHandler,
  ) {}

  @Post()
  @ApiOperation({
    summary: '투표 참여 기록',
    description: '온라인, 현장, 방문 채널의 투표 참여를 기록합니다.',
  })
  @ApiBody({
    type: CastParticipationBody,
    description: '투표 참여 정보입니다.',
  })
  @ApiCreatedResponse({
    type: CastParticipationResponse,
    description: '투표 참여 기록 결과입니다.',
  })
  async castParticipation(
    @Body() body: CastParticipationBody,
  ): Promise<CastParticipationResponse> {
    const result = await this.castParticipationHandler.execute(
      CastParticipationCommand.of({
        voteId: body.voteId,
        voteDetailId: body.voteDetailId,
        electorId: body.electorId,
        selectedCandidateId: body.selectedCandidateId,
        votingChannel: body.votingChannel,
        fieldVotingSessionId: body.fieldVotingSessionId,
        participatedAt: new Date(body.participatedAt),
      }),
    );

    return CastParticipationResponse.of(result);
  }

  @Post(':participationId/field-evidence')
  @ApiOperation({
    summary: '현장 투표 참여 증빙 기록',
    description: '현장 또는 방문 투표 참여의 확인 증빙을 기록합니다.',
  })
  @ApiParam({
    name: 'participationId',
    example: 'participation-1',
    description: '증빙을 기록할 투표 참여 ID입니다.',
  })
  @ApiBody({
    type: RecordFieldParticipationEvidenceBody,
    description: '현장 투표 참여 증빙 정보입니다.',
  })
  @ApiCreatedResponse({
    type: RecordFieldParticipationEvidenceResponse,
    description: '현장 투표 참여 증빙 기록 결과입니다.',
  })
  async recordFieldParticipationEvidence(
    @Param() params: RecordFieldParticipationEvidenceParam,
    @Body() body: RecordFieldParticipationEvidenceBody,
  ): Promise<RecordFieldParticipationEvidenceResponse> {
    const result = await this.recordFieldParticipationEvidenceHandler.execute(
      RecordFieldParticipationEvidenceCommand.of({
        participationId: params.participationId,
        fieldVotingSessionId: body.fieldVotingSessionId,
        verifiedByCommissionMemberId: body.verifiedByCommissionMemberId,
        evidenceFileId: body.evidenceFileId,
        verificationNote: body.verificationNote,
        verifiedAt: new Date(body.verifiedAt),
      }),
    );

    return RecordFieldParticipationEvidenceResponse.of(result);
  }
}
