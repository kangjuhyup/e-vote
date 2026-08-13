import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AttachmentTargetType } from '../../../application/port/attachment-repository.port';
import { ConfirmAttachmentUploadCommand } from '../../../application/command/confirm-attachment-upload.command';
import { ConfirmAttachmentUploadHandler } from '../../../application/command/confirm-attachment-upload.handler';
import { CreateCandidateCommand } from '../../../application/command/create-candidate.command';
import { CreateCandidateHandler } from '../../../application/command/create-candidate.handler';
import { RequestAttachmentUploadCommand } from '../../../application/command/request-attachment-upload.command';
import { RequestAttachmentUploadHandler } from '../../../application/command/request-attachment-upload.handler';
import { GetCandidatePageHandler } from '../../../application/query/get-candidate-page.handler';
import { GetCandidatePageQuery as GetCandidatePageApplicationQuery } from '../../../application/query/get-candidate-page.query';
import {
  CandidateNotFoundError,
  GetCandidateHandler,
} from '../../../application/query/get-candidate.handler';
import { GetCandidateQuery } from '../../../application/query/get-candidate.query';
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
import { GetCandidatePageQuery as GetCandidatePageRequestQuery } from './dto/get-candidate-page-request.dto';
import { GetCandidatePageResponse } from './dto/get-candidate-page-response.dto';
import { GetCandidateParam } from './dto/get-candidate-request.dto';
import { GetCandidateResponse } from './dto/get-candidate-response.dto';

@ApiTags('candidates')
@Controller('votes/:voteId/sub-votes/:voteDetailId/candidates')
export class CandidateController {
  constructor(
    private readonly createCandidateHandler: CreateCandidateHandler,
    private readonly getCandidateHandler: GetCandidateHandler,
    private readonly getCandidatePageHandler: GetCandidatePageHandler,
    private readonly requestAttachmentUploadHandler: RequestAttachmentUploadHandler,
    private readonly confirmAttachmentUploadHandler: ConfirmAttachmentUploadHandler,
  ) {}

  @Get()
  @ApiOperation({
    summary: '후보 페이지 조회',
    description: '자식 투표에 등록된 후보 목록을 페이지 단위로 조회합니다.',
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
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: '조회할 페이지 번호입니다. 생략하면 1입니다.',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    example: 20,
    description: '페이지당 후보 수입니다. 생략하면 20이고 최대 100입니다.',
  })
  @ApiOkResponse({
    type: GetCandidatePageResponse,
    description: '후보 페이지 조회 결과입니다.',
  })
  async getCandidatePage(
    @Param() params: CreateCandidateParam,
    @Query() query: GetCandidatePageRequestQuery,
  ): Promise<GetCandidatePageResponse> {
    const result = await this.getCandidatePageHandler.execute(
      GetCandidatePageApplicationQuery.of({
        voteId: params.voteId,
        voteDetailId: params.voteDetailId,
        page: Number(query.page),
        pageSize: Number(query.pageSize),
      }),
    );

    return GetCandidatePageResponse.of(result);
  }

  @Get(':candidateId')
  @ApiOperation({
    summary: '후보 상세 조회',
    description: '자식 투표에 등록된 단일 후보를 조회합니다.',
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
    description: '조회할 후보 ID입니다.',
  })
  @ApiOkResponse({
    type: GetCandidateResponse,
    description: '후보 상세 조회 결과입니다.',
  })
  @ApiNotFoundResponse({
    description: '후보를 찾을 수 없습니다.',
  })
  async getCandidate(
    @Param() params: GetCandidateParam,
  ): Promise<GetCandidateResponse> {
    try {
      const result = await this.getCandidateHandler.execute(
        GetCandidateQuery.of({
          voteId: params.voteId,
          voteDetailId: params.voteDetailId,
          candidateId: params.candidateId,
        }),
      );

      return GetCandidateResponse.of(result);
    } catch (error) {
      if (error instanceof CandidateNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

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
