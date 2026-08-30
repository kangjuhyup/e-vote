import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RecordFieldParticipationEvidenceCommand } from '../../application/command/dto/request/record-field-participation-evidence.command';
import { RecordFieldParticipationEvidenceHandler } from '../../application/command/handler/record-field-participation-evidence.handler';
import {
  RecordFieldParticipationEvidenceBody,
  RecordFieldParticipationEvidenceParam,
} from './dto/record-field-participation-evidence-request.dto';
import { RecordFieldParticipationEvidenceResponse } from './dto/record-field-participation-evidence-response.dto';

@ApiTags('participations')
@Controller('participations')
export class FieldParticipationEvidenceController {
  constructor(
    private readonly recordFieldParticipationEvidenceHandler: RecordFieldParticipationEvidenceHandler,
  ) {}

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
