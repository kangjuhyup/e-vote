import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { VoteOrganizationProtected } from '../../../../shared/presentation/common/decorator/vote-organization-protected.decorator';
import { ElectorParticipantForbiddenError } from '../../../../shared/application/port/capability/elector-participant-access.port';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { ConfirmElectorSignatureUploadCommand } from '../../application/command/dto/request/confirm-elector-signature-upload.command';
import { RequestElectorSignatureUploadCommand } from '../../application/command/dto/request/request-elector-signature-upload.command';
import {
  ElectorSignatureMetadataMismatchError,
  ElectorSignatureObjectNotFoundError,
  ConfirmElectorSignatureUploadHandler,
} from '../../application/command/handler/confirm-elector-signature-upload.handler';
import { RequestElectorSignatureUploadHandler } from '../../application/command/handler/request-elector-signature-upload.handler';
import {
  ElectorSignatureSizeExceededError,
  EmptyElectorSignatureFileNameError,
  EmptyElectorSignatureStorageKeyError,
  InvalidElectorSignatureSizeError,
  UnsupportedElectorSignatureMimeTypeError,
} from '../../application/command/elector-signature-upload.policy';
import {
  ConfirmElectorSignatureUploadBody,
  ElectorSignatureParam,
  RequestElectorSignatureUploadBody,
} from './dto/elector-signature-upload-request.dto';
import {
  ConfirmElectorSignatureUploadResponse,
  RequestElectorSignatureUploadResponse,
} from './dto/elector-signature-upload-response.dto';

@ApiTags('electors')
@Controller('votes/:voteId/electors/:electorId/signature')
@VoteOrganizationProtected()
export class ElectorSignatureController {
  constructor(
    private readonly requestHandler: RequestElectorSignatureUploadHandler,
    private readonly confirmHandler: ConfirmElectorSignatureUploadHandler,
  ) {}

  @Post('upload-url')
  @HttpCode(200)
  @ApiOperation({ summary: '투표 참여 서명 이미지 업로드 주소 요청' })
  @ApiBody({ type: RequestElectorSignatureUploadBody })
  @ApiOkResponse({ type: RequestElectorSignatureUploadResponse })
  @ApiForbiddenResponse({ description: '인증된 선거인의 소유자가 아닙니다.' })
  async requestUpload(
    @User() user: UserPrincipal,
    @Param() params: ElectorSignatureParam,
    @Body() body: RequestElectorSignatureUploadBody,
  ): Promise<RequestElectorSignatureUploadResponse> {
    try {
      return RequestElectorSignatureUploadResponse.of(
        await this.requestHandler.execute(
          RequestElectorSignatureUploadCommand.of({
            ...params,
            userPrincipalId: user.id,
            ...body,
          }),
        ),
      );
    } catch (error) {
      throwElectorSignatureHttpError(error);
    }
  }

  @Post('confirm')
  @ApiOperation({
    summary: '투표 참여 서명 이미지 업로드 확정',
    description:
      '스토리지 객체를 검증해 서명을 확정합니다. 이 호출이 성공해야 투표 참여를 제출할 수 있습니다.',
  })
  @ApiBody({ type: ConfirmElectorSignatureUploadBody })
  @ApiCreatedResponse({ type: ConfirmElectorSignatureUploadResponse })
  @ApiBadRequestResponse({
    description: '업로드 메타데이터가 일치하지 않습니다.',
  })
  @ApiNotFoundResponse({ description: '업로드된 객체가 없습니다.' })
  @ApiForbiddenResponse({ description: '인증된 선거인의 소유자가 아닙니다.' })
  async confirmUpload(
    @User() user: UserPrincipal,
    @Param() params: ElectorSignatureParam,
    @Body() body: ConfirmElectorSignatureUploadBody,
  ): Promise<ConfirmElectorSignatureUploadResponse> {
    try {
      return ConfirmElectorSignatureUploadResponse.of(
        await this.confirmHandler.execute(
          ConfirmElectorSignatureUploadCommand.of({
            ...params,
            userPrincipalId: user.id,
            ...body,
          }),
        ),
      );
    } catch (error) {
      throwElectorSignatureHttpError(error);
    }
  }
}

function throwElectorSignatureHttpError(error: unknown): never {
  if (error instanceof ElectorParticipantForbiddenError) {
    throw new ForbiddenException(error.message);
  }
  if (error instanceof ElectorSignatureObjectNotFoundError) {
    throw new NotFoundException(error.message);
  }
  if (error instanceof ElectorSignatureMetadataMismatchError) {
    throw new BadRequestException(error.message);
  }
  if (
    error instanceof EmptyElectorSignatureFileNameError ||
    error instanceof EmptyElectorSignatureStorageKeyError ||
    error instanceof InvalidElectorSignatureSizeError ||
    error instanceof ElectorSignatureSizeExceededError ||
    error instanceof UnsupportedElectorSignatureMimeTypeError
  ) {
    throw new BadRequestException(error.message);
  }
  throw error;
}
