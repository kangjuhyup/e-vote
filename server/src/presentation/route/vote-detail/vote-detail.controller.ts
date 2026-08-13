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
import { CreateVoteDetailCommand } from '../../../application/command/create-vote-detail.command';
import { CreateVoteDetailHandler } from '../../../application/command/create-vote-detail.handler';
import { RequestAttachmentUploadCommand } from '../../../application/command/request-attachment-upload.command';
import { RequestAttachmentUploadHandler } from '../../../application/command/request-attachment-upload.handler';
import { ConfirmAttachmentUploadBody } from '../attachment/dto/confirm-attachment-upload-request.dto';
import { ConfirmAttachmentUploadResponse } from '../attachment/dto/confirm-attachment-upload-response.dto';
import { RequestAttachmentUploadBody } from '../attachment/dto/request-attachment-upload-request.dto';
import { RequestAttachmentUploadResponse } from '../attachment/dto/request-attachment-upload-response.dto';
import { throwAttachmentUploadHttpError } from '../attachment/attachment-upload-error.mapper';
import {
  CreateVoteDetailBody,
  CreateVoteDetailParam,
  VoteDetailAttachmentParam,
} from './dto/create-vote-detail-request.dto';
import { CreateVoteDetailResponse } from './dto/create-vote-detail-response.dto';

@ApiTags('vote-details')
@Controller('votes/:voteId/sub-votes')
export class VoteDetailController {
  constructor(
    private readonly createVoteDetailHandler: CreateVoteDetailHandler,
    private readonly requestAttachmentUploadHandler: RequestAttachmentUploadHandler,
    private readonly confirmAttachmentUploadHandler: ConfirmAttachmentUploadHandler,
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

  @Post(':voteDetailId/attachments/upload-url')
  @HttpCode(200)
  @ApiOperation({
    summary: '자식 투표 첨부파일 업로드 주소 요청',
    description: '자식 투표 첨부파일 업로드용 presigned URL을 발급합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiParam({
    name: 'voteDetailId',
    example: 'vote-detail-1',
    description: '자식 투표 ID입니다.',
  })
  @ApiBody({
    type: RequestAttachmentUploadBody,
    description: '업로드할 첨부파일 정보입니다.',
  })
  @ApiOkResponse({
    type: RequestAttachmentUploadResponse,
    description: '첨부파일 업로드 주소입니다.',
  })
  async requestVoteDetailAttachmentUpload(
    @Param() params: VoteDetailAttachmentParam,
    @Body() body: RequestAttachmentUploadBody,
  ): Promise<RequestAttachmentUploadResponse> {
    try {
      const result = await this.requestAttachmentUploadHandler.execute(
        RequestAttachmentUploadCommand.of({
          target: {
            targetType: AttachmentTargetType.VoteDetail,
            voteId: params.voteId,
            voteDetailId: params.voteDetailId,
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

  @Post(':voteDetailId/attachments/confirm')
  @ApiOperation({
    summary: '자식 투표 첨부파일 업로드 확인',
    description:
      '스토리지 업로드 여부를 확인한 뒤 자식 투표 첨부파일로 저장합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiParam({
    name: 'voteDetailId',
    example: 'vote-detail-1',
    description: '자식 투표 ID입니다.',
  })
  @ApiBody({
    type: ConfirmAttachmentUploadBody,
    description: '확인할 첨부파일 업로드 정보입니다.',
  })
  @ApiCreatedResponse({
    type: ConfirmAttachmentUploadResponse,
    description: '저장된 자식 투표 첨부파일 정보입니다.',
  })
  async confirmVoteDetailAttachmentUpload(
    @Param() params: VoteDetailAttachmentParam,
    @Body() body: ConfirmAttachmentUploadBody,
  ): Promise<ConfirmAttachmentUploadResponse> {
    try {
      const result = await this.confirmAttachmentUploadHandler.execute(
        ConfirmAttachmentUploadCommand.of({
          target: {
            targetType: AttachmentTargetType.VoteDetail,
            voteId: params.voteId,
            voteDetailId: params.voteDetailId,
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
