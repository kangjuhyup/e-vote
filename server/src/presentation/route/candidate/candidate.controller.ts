import { Body, Controller, HttpCode, Param, Post, Put } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AttachmentTargetType } from '../../../application/port/attachment-repository.port';
import { ConfirmAttachmentUploadCommand } from '../../../application/command/confirm-attachment-upload.command';
import { ConfirmAttachmentUploadHandler } from '../../../application/command/confirm-attachment-upload.handler';
import { CreateCandidateCommand } from '../../../application/command/create-candidate.command';
import { CreateCandidateHandler } from '../../../application/command/create-candidate.handler';
import { RequestAttachmentUploadCommand } from '../../../application/command/request-attachment-upload.command';
import { RequestAttachmentUploadHandler } from '../../../application/command/request-attachment-upload.handler';
import { ConfirmAttachmentUploadBody } from '../attachment/dto/confirm-attachment-upload-request.dto';
import { ConfirmAttachmentUploadResponse } from '../attachment/dto/confirm-attachment-upload-response.dto';
import { RequestAttachmentUploadBody } from '../attachment/dto/request-attachment-upload-request.dto';
import { RequestAttachmentUploadResponse } from '../attachment/dto/request-attachment-upload-response.dto';
import { throwAttachmentUploadHttpError } from '../attachment/attachment-upload-error.mapper';
import {
  CandidateAttachmentParam,
  CreateCandidateBody,
  CreateCandidateParam,
} from './dto/create-candidate-request.dto';
import { CreateCandidateResponse } from './dto/create-candidate-response.dto';

@ApiTags('candidates')
@Controller('votes/:voteId/sub-votes/:voteDetailId/candidates')
export class CandidateController {
  constructor(
    private readonly createCandidateHandler: CreateCandidateHandler,
    private readonly requestAttachmentUploadHandler: RequestAttachmentUploadHandler,
    private readonly confirmAttachmentUploadHandler: ConfirmAttachmentUploadHandler,
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

  @Post(':candidateId/attachments/upload-url')
  @HttpCode(200)
  @ApiOperation({
    summary: '후보자 첨부파일 업로드 주소 요청',
    description: '후보자 첨부파일 업로드용 presigned URL을 발급합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiParam({
    name: 'voteDetailId',
    example: 'vote-detail-1',
    description: '후보가 속한 자식 투표 ID입니다.',
  })
  @ApiParam({
    name: 'candidateId',
    example: 'candidate-1',
    description: '후보 ID입니다.',
  })
  @ApiBody({
    type: RequestAttachmentUploadBody,
    description: '업로드할 첨부파일 정보입니다.',
  })
  @ApiOkResponse({
    type: RequestAttachmentUploadResponse,
    description: '첨부파일 업로드 주소입니다.',
  })
  async requestCandidateAttachmentUpload(
    @Param() params: CandidateAttachmentParam,
    @Body() body: RequestAttachmentUploadBody,
  ): Promise<RequestAttachmentUploadResponse> {
    try {
      const result = await this.requestAttachmentUploadHandler.execute(
        RequestAttachmentUploadCommand.of({
          target: {
            targetType: AttachmentTargetType.Candidate,
            voteId: params.voteId,
            voteDetailId: params.voteDetailId,
            candidateId: params.candidateId,
          },
          attachmentType: body.attachmentType,
          originalName: body.originalName,
          mimeType: body.mimeType,
          sizeBytes: body.sizeBytes,
          sortOrder: body.sortOrder,
        }),
      );

      return RequestAttachmentUploadResponse.of(result);
    } catch (error) {
      throwAttachmentUploadHttpError(error);
    }
  }

  @Post(':candidateId/attachments/confirm')
  @ApiOperation({
    summary: '후보자 첨부파일 업로드 확인',
    description:
      '스토리지 업로드 여부를 확인한 뒤 후보자 첨부파일로 저장합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiParam({
    name: 'voteDetailId',
    example: 'vote-detail-1',
    description: '후보가 속한 자식 투표 ID입니다.',
  })
  @ApiParam({
    name: 'candidateId',
    example: 'candidate-1',
    description: '후보 ID입니다.',
  })
  @ApiBody({
    type: ConfirmAttachmentUploadBody,
    description: '확인할 첨부파일 업로드 정보입니다.',
  })
  @ApiCreatedResponse({
    type: ConfirmAttachmentUploadResponse,
    description: '저장된 후보자 첨부파일 정보입니다.',
  })
  async confirmCandidateAttachmentUpload(
    @Param() params: CandidateAttachmentParam,
    @Body() body: ConfirmAttachmentUploadBody,
  ): Promise<ConfirmAttachmentUploadResponse> {
    try {
      const result = await this.confirmAttachmentUploadHandler.execute(
        ConfirmAttachmentUploadCommand.of({
          target: {
            targetType: AttachmentTargetType.Candidate,
            voteId: params.voteId,
            voteDetailId: params.voteDetailId,
            candidateId: params.candidateId,
          },
          attachmentType: body.attachmentType,
          storageKey: body.storageKey,
          originalName: body.originalName,
          mimeType: body.mimeType,
          sizeBytes: body.sizeBytes,
          checksum: body.checksum,
          sortOrder: body.sortOrder,
        }),
      );

      return ConfirmAttachmentUploadResponse.of(result);
    } catch (error) {
      throwAttachmentUploadHttpError(error);
    }
  }
}
