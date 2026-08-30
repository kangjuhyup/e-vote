import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ConfirmAttachmentUploadCommand } from '../../../application/command/dto/request/confirm-attachment-upload.command';
import { ConfirmAttachmentUploadHandler } from '../../../application/command/handler/confirm-attachment-upload.handler';
import { RequestAttachmentUploadCommand } from '../../../application/command/dto/request/request-attachment-upload.command';
import { RequestAttachmentUploadHandler } from '../../../application/command/handler/request-attachment-upload.handler';
import { AttachmentTargetType } from '../../../application/port/persistence/command/attachment-repository.port';
import { throwAttachmentUploadHttpError } from '../attachment/attachment-upload-error.mapper';
import { ConfirmAttachmentUploadBody } from '../attachment/dto/confirm-attachment-upload-request.dto';
import { ConfirmAttachmentUploadResponse } from '../attachment/dto/confirm-attachment-upload-response.dto';
import { RequestAttachmentUploadBody } from '../attachment/dto/request-attachment-upload-request.dto';
import { RequestAttachmentUploadResponse } from '../attachment/dto/request-attachment-upload-response.dto';
import { VoteParam } from './dto/create-vote-request.dto';

@ApiTags('votes')
@Controller('votes')
export class VoteAttachmentController {
  constructor(
    private readonly requestAttachmentUploadHandler: RequestAttachmentUploadHandler,
    private readonly confirmAttachmentUploadHandler: ConfirmAttachmentUploadHandler,
  ) {}

  @Post(':voteId/attachments/upload-url')
  @HttpCode(200)
  @ApiOperation({
    summary: '부모 투표 첨부파일 업로드 주소 요청',
    description: '부모 투표 첨부파일 업로드용 presigned URL을 발급합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiBody({
    type: RequestAttachmentUploadBody,
    description: '업로드할 첨부파일 정보입니다.',
  })
  @ApiOkResponse({
    type: RequestAttachmentUploadResponse,
    description: '첨부파일 업로드 주소입니다.',
  })
  async requestVoteAttachmentUpload(
    @Param() params: VoteParam,
    @Body() body: RequestAttachmentUploadBody,
  ): Promise<RequestAttachmentUploadResponse> {
    try {
      const result = await this.requestAttachmentUploadHandler.execute(
        RequestAttachmentUploadCommand.of({
          target: {
            targetType: AttachmentTargetType.Vote,
            voteId: params.voteId,
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

  @Post(':voteId/attachments/confirm')
  @ApiOperation({
    summary: '부모 투표 첨부파일 업로드 확인',
    description:
      '스토리지 업로드 여부를 확인한 뒤 부모 투표 첨부파일로 저장합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiBody({
    type: ConfirmAttachmentUploadBody,
    description: '확인할 첨부파일 업로드 정보입니다.',
  })
  @ApiCreatedResponse({
    type: ConfirmAttachmentUploadResponse,
    description: '저장된 부모 투표 첨부파일 정보입니다.',
  })
  async confirmVoteAttachmentUpload(
    @Param() params: VoteParam,
    @Body() body: ConfirmAttachmentUploadBody,
  ): Promise<ConfirmAttachmentUploadResponse> {
    try {
      const result = await this.confirmAttachmentUploadHandler.execute(
        ConfirmAttachmentUploadCommand.of({
          target: {
            targetType: AttachmentTargetType.Vote,
            voteId: params.voteId,
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
