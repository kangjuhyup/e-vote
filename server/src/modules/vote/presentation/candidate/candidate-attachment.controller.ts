import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { VoteOrganizationProtected } from '../../../../shared/presentation/common/decorator/vote-organization-protected.decorator';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ConfirmAttachmentUploadCommand } from '../../application/command/dto/request/confirm-attachment-upload.command';
import { ConfirmAttachmentUploadHandler } from '../../application/command/handler/confirm-attachment-upload.handler';
import { DeleteAttachmentCommand } from '../../application/command/dto/request/delete-attachment.command';
import { DeleteAttachmentHandler } from '../../application/command/handler/delete-attachment.handler';
import { RequestAttachmentUploadCommand } from '../../application/command/dto/request/request-attachment-upload.command';
import { RequestAttachmentUploadHandler } from '../../application/command/handler/request-attachment-upload.handler';
import { GetAttachmentDownloadUrlQuery } from '../../application/query/dto/request/get-attachment-download-url.query';
import { GetAttachmentDownloadUrlHandler } from '../../application/query/handler/get-attachment-download-url.handler';
import { AttachmentTargetType } from '../../application/port/persistence/command/attachment-repository.port';
import { throwAttachmentUploadHttpError } from '../attachment/attachment-upload-error.mapper';
import { ConfirmAttachmentUploadBody } from '../attachment/dto/confirm-attachment-upload-request.dto';
import { ConfirmAttachmentUploadResponse } from '../attachment/dto/confirm-attachment-upload-response.dto';
import { RequestAttachmentUploadBody } from '../attachment/dto/request-attachment-upload-request.dto';
import { RequestAttachmentUploadResponse } from '../attachment/dto/request-attachment-upload-response.dto';
import { GetAttachmentDownloadUrlResponse } from '../attachment/dto/get-attachment-download-url-response.dto';
import {
  CandidateAttachmentManagementParam,
  CandidateAttachmentParam,
} from './dto/create-candidate-request.dto';

@ApiTags('candidates')
@Controller('votes/:voteId/sub-votes/:voteDetailId/candidates')
@VoteOrganizationProtected()
export class CandidateAttachmentController {
  constructor(
    private readonly requestAttachmentUploadHandler: RequestAttachmentUploadHandler,
    private readonly confirmAttachmentUploadHandler: ConfirmAttachmentUploadHandler,
    private readonly getAttachmentDownloadUrlHandler: GetAttachmentDownloadUrlHandler,
    private readonly deleteAttachmentHandler: DeleteAttachmentHandler,
  ) {}

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
    @User() user: UserPrincipal,
    @Param() params: CandidateAttachmentParam,
    @Body() body: RequestAttachmentUploadBody,
  ): Promise<RequestAttachmentUploadResponse> {
    try {
      const result = await this.requestAttachmentUploadHandler.execute(
        RequestAttachmentUploadCommand.of({
          userPrincipalId: user.id,
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
    @User() user: UserPrincipal,
    @Param() params: CandidateAttachmentParam,
    @Body() body: ConfirmAttachmentUploadBody,
  ): Promise<ConfirmAttachmentUploadResponse> {
    try {
      const result = await this.confirmAttachmentUploadHandler.execute(
        ConfirmAttachmentUploadCommand.of({
          userPrincipalId: user.id,
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

  @Get(':candidateId/attachments/:attachmentId/download-url')
  @VoteOrganizationProtected('read')
  @ApiOperation({ summary: '후보자 첨부파일 다운로드 주소 요청' })
  @ApiOkResponse({ type: GetAttachmentDownloadUrlResponse })
  async getCandidateAttachmentDownloadUrl(
    @User() user: UserPrincipal,
    @Param() params: CandidateAttachmentManagementParam,
  ): Promise<GetAttachmentDownloadUrlResponse> {
    try {
      return GetAttachmentDownloadUrlResponse.of(
        await this.getAttachmentDownloadUrlHandler.execute(
          GetAttachmentDownloadUrlQuery.of({
            userPrincipalId: user.id,
            target: {
              targetType: AttachmentTargetType.Candidate,
              voteId: params.voteId,
              voteDetailId: params.voteDetailId,
              candidateId: params.candidateId,
            },
            attachmentId: params.attachmentId,
          }),
        ),
      );
    } catch (error) {
      throwAttachmentUploadHttpError(error);
    }
  }

  @Delete(':candidateId/attachments/:attachmentId')
  @HttpCode(204)
  @ApiOperation({ summary: '후보자 첨부파일 삭제' })
  @ApiNoContentResponse({ description: '첨부파일을 삭제했습니다.' })
  async deleteCandidateAttachment(
    @User() user: UserPrincipal,
    @Param() params: CandidateAttachmentManagementParam,
  ): Promise<void> {
    try {
      await this.deleteAttachmentHandler.execute(
        DeleteAttachmentCommand.of({
          userPrincipalId: user.id,
          target: {
            targetType: AttachmentTargetType.Candidate,
            voteId: params.voteId,
            voteDetailId: params.voteDetailId,
            candidateId: params.candidateId,
          },
          attachmentId: params.attachmentId,
        }),
      );
    } catch (error) {
      throwAttachmentUploadHttpError(error);
    }
  }
}
