import type { Request, Response } from 'express';
import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Inject,
  HttpException,
  HttpStatus,
  Optional,
  Post,
  Param,
  Req,
  Res,
  UnauthorizedException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../../../shared/presentation/common/decorator/public.decorator';
import { ExchangeParticipationAccessCommand } from '../../application/command/dto/request/exchange-participation-access.command';
import { ExchangeParticipationAccessHandler } from '../../application/command/handler/exchange-participation-access.handler';
import {
  ParticipationAccessConflictError,
  ParticipationAccessInvalidError,
  ParticipationAccessUnavailableError,
} from '../../application/command/participation-access.error';
import {
  InvalidParticipationAccessTokenError,
  ParticipationAccessNotConfiguredError,
} from '../../application/port/security/participation-access-token.port';
import { ResolveParticipationAccessSessionHandler } from '../../application/query/handler/resolve-participation-access-session.handler';
import {
  ParticipationAccessCsrfDeniedError,
  ParticipationAccessSessionInvalidError,
} from '../../application/query/participation-access-session.error';
import {
  CastParticipationAccessBody,
  ExchangeParticipationAccessBody,
  ParticipationAccessResponse,
  ParticipationAccessVoteDetailParam,
  ParticipationSignatureUploadBody,
  ConfirmParticipationSignatureUploadBody,
  ParticipationSignatureUploadResponse,
  ConfirmParticipationSignatureUploadResponse,
} from './dto/participation-access.dto';
import { ParticipantSignatureUploadHandler } from '../../application/command/handler/participant-signature-upload.handler';
import { CastParticipationWithAccessHandler } from '../../application/command/handler/cast-participation-with-access.handler';
import { CastParticipationWithAccessCommand } from '../../application/command/dto/request/cast-participation-with-access.command';
import { CastParticipationResponse } from '../participation/dto/cast-participation-response.dto';
import {
  CandidateNotFoundError,
  ElectorNotFoundError,
  FieldVotingSessionNotFoundError,
  ParticipationSignatureRequiredError,
  VoteDetailNotFoundError,
  VoteNotFoundError,
} from '../../application/command/handler/cast-participation.handler';
import { DomainError } from '../../../../shared/domain/domain-error';
import { GetParticipationResultWithAccessHandler } from '../../application/query/handler/get-participation-result-with-access.handler';
import { GetParticipationAccessHandler } from '../../application/query/handler/get-participation-access.handler';
import { RevokeParticipationAccessSessionHandler } from '../../application/command/handler/revoke-participation-access-session.handler';
import { GetVoteResultResponse } from '../vote-statistics/dto/get-vote-result-response.dto';
import {
  PARTICIPATION_ACCESS_RATE_LIMIT_PORT,
  ParticipationAccessRateLimitExceededError,
  ParticipationAccessRateLimitUnavailableError,
  type ParticipationAccessRateLimitPort,
} from '../../application/port/security/participation-access-rate-limit.port';
import {
  VoteResultUnavailableError,
  VoteStatisticsInconsistentError,
  VoteStatisticsNotFoundError,
} from '../../application/query/vote-statistics.error';

export const PARTICIPATION_ALLOWED_ORIGINS = Symbol(
  'PARTICIPATION_ALLOWED_ORIGINS',
);
const SESSION_COOKIE = 'vote_participant_session';

@Public()
@ApiTags('participation-access')
@Controller('participation-access')
export class ParticipationAccessController {
  constructor(
    private readonly exchangeHandler: ExchangeParticipationAccessHandler,
    private readonly resolveHandler: ResolveParticipationAccessSessionHandler,
    @Inject(PARTICIPATION_ALLOWED_ORIGINS)
    private readonly allowedOrigins: readonly string[],
    private readonly signatureHandler?: ParticipantSignatureUploadHandler,
    private readonly castHandler?: CastParticipationWithAccessHandler,
    private readonly resultHandler?: GetParticipationResultWithAccessHandler,
    private readonly getAccessHandler?: GetParticipationAccessHandler,
    private readonly revokeSessionHandler?: RevokeParticipationAccessSessionHandler,
    @Optional()
    @Inject(PARTICIPATION_ACCESS_RATE_LIMIT_PORT)
    private readonly rateLimit?: ParticipationAccessRateLimitPort,
  ) {}

  @Post('exchange')
  @HttpCode(200)
  @ApiOperation({ summary: 'SMS 참여 링크를 브라우저 세션으로 교환' })
  @ApiOkResponse({ type: ParticipationAccessResponse })
  async exchange(
    @Body() body: ExchangeParticipationAccessBody,
    @Req() request: Pick<Request, 'headers'> & Partial<Pick<Request, 'ip'>>,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ParticipationAccessResponse> {
    this.assertOrigin(request.headers.origin);
    this.preventCaching(response);
    try {
      await this.rateLimit?.consume({
        clientAddress: request.ip ?? 'unknown',
        referenceToken: body.token,
      });
      const result = await this.exchangeHandler.execute(
        ExchangeParticipationAccessCommand.of({
          token: body.token,
          currentSessionToken: readCookie(
            request.headers.cookie,
            SESSION_COOKIE,
          ),
        }),
      );
      response.cookie(SESSION_COOKIE, result.sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/participation-access',
        expires: result.sessionExpiresAt,
      });
      return ParticipationAccessResponse.of({
        csrfToken: result.csrfToken,
        scope: result.scope,
        voteId: result.voteId,
        sessionExpiresAt: result.sessionExpiresAt.toISOString(),
      });
    } catch (error) {
      throwAccessHttpError(error);
    }
  }

  @Get('sub-votes/:voteDetailId/results')
  @ApiOperation({ summary: '종료된 투표의 집계 결과 조회' })
  async getResult(
    @Param() params: ParticipationAccessVoteDetailParam,
    @Req() request: Pick<Request, 'headers'>,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GetVoteResultResponse> {
    this.assertOrigin(request.headers.origin);
    this.preventCaching(response);
    const sessionToken = readCookie(request.headers.cookie, SESSION_COOKIE);
    if (!sessionToken)
      throw new UnauthorizedException('participation access is invalid');
    try {
      const result = await this.resultHandler?.execute({
        sessionToken,
        voteDetailId: params.voteDetailId,
      });
      if (!result)
        throw new Error('participant result handler is not configured');
      return GetVoteResultResponse.of(result);
    } catch (error) {
      if (error instanceof VoteStatisticsNotFoundError) {
        throw new NotFoundException('participation resource was not found');
      }
      if (
        error instanceof VoteResultUnavailableError ||
        error instanceof VoteStatisticsInconsistentError
      ) {
        throw new ConflictException(error.message);
      }
      throwAccessHttpError(error);
    }
  }

  @Post('signature/upload-url')
  @HttpCode(200)
  @ApiOperation({ summary: '참여 세션의 서명 이미지 업로드 주소 요청' })
  async requestSignatureUpload(
    @Body() body: ParticipationSignatureUploadBody,
    @Req() request: Pick<Request, 'headers'>,
    @Headers('x-csrf-token') csrfToken: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ParticipationSignatureUploadResponse> {
    this.assertOrigin(request.headers.origin);
    this.preventCaching(response);
    const credentials = this.requireMutationCredentials(request, csrfToken);
    try {
      const result = await this.signatureHandler?.requestUpload({
        ...credentials,
        ...body,
      });
      if (!result)
        throw new Error('participant signature handler is not configured');
      return ParticipationSignatureUploadResponse.of(result);
    } catch (error) {
      throwCapabilityMutationHttpError(error);
    }
  }

  @Post('signature/confirm')
  @ApiOperation({ summary: '참여 세션의 서명 이미지 업로드 확정' })
  async confirmSignatureUpload(
    @Body() body: ConfirmParticipationSignatureUploadBody,
    @Req() request: Pick<Request, 'headers'>,
    @Headers('x-csrf-token') csrfToken: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ConfirmParticipationSignatureUploadResponse> {
    this.assertOrigin(request.headers.origin);
    this.preventCaching(response);
    const credentials = this.requireMutationCredentials(request, csrfToken);
    try {
      const result = await this.signatureHandler?.confirmUpload({
        ...credentials,
        ...body,
      });
      if (!result)
        throw new Error('participant signature handler is not configured');
      return ConfirmParticipationSignatureUploadResponse.of(result);
    } catch (error) {
      throwCapabilityMutationHttpError(error);
    }
  }

  @Post('participations')
  @ApiOperation({ summary: '참여 세션으로 투표 제출' })
  async castParticipation(
    @Body() body: CastParticipationAccessBody,
    @Req() request: Pick<Request, 'headers'>,
    @Headers('x-csrf-token') csrfToken: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CastParticipationResponse> {
    this.assertOrigin(request.headers.origin);
    this.preventCaching(response);
    const credentials = this.requireMutationCredentials(request, csrfToken);
    try {
      const result = await this.castHandler?.execute(
        CastParticipationWithAccessCommand.of({ ...credentials, ...body }),
      );
      if (!result)
        throw new Error('participant casting handler is not configured');
      return CastParticipationResponse.of(result);
    } catch (error) {
      throwCapabilityMutationHttpError(error);
    }
  }

  @Get()
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: '현재 브라우저 참여 권한 확인' })
  async getAccess(
    @Req() request: Pick<Request, 'headers'>,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ParticipationAccessResponse> {
    this.assertOrigin(request.headers.origin);
    this.preventCaching(response);
    const sessionToken = readCookie(request.headers.cookie, SESSION_COOKIE);
    if (!sessionToken)
      throw new UnauthorizedException('participation access is invalid');
    try {
      const access = await this.getAccessHandler?.execute(sessionToken);
      if (!access)
        throw new Error('participant access read handler is not configured');
      return ParticipationAccessResponse.of({
        scope: access.scope,
        voteId: access.vote.id,
        csrfToken: access.csrfToken,
        vote: access.vote,
        voteDetails: access.voteDetails,
        hasConfirmedSignature: access.hasConfirmedSignature,
        permittedActions: access.permittedActions,
      });
    } catch (error) {
      throwAccessHttpError(error);
    }
  }

  @Delete('session')
  @HttpCode(204)
  async logout(
    @Headers('origin') origin: string | undefined,
    @Req() request: Pick<Request, 'headers'>,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    this.assertOrigin(origin);
    this.preventCaching(response);
    const sessionToken = readCookie(request.headers.cookie, SESSION_COOKIE);
    if (sessionToken) {
      await this.revokeSessionHandler?.execute(sessionToken);
    }
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/participation-access',
    });
  }

  private assertOrigin(origin: string | undefined): void {
    if (!origin || !this.allowedOrigins.includes(origin)) {
      throw new ForbiddenException('request origin is not allowed');
    }
  }

  private preventCaching(response: Response): void {
    response.setHeader('Cache-Control', 'no-store');
  }

  private requireMutationCredentials(
    request: Pick<Request, 'headers'>,
    csrfToken: string | undefined,
  ): { readonly sessionToken: string; readonly csrfToken: string } {
    const sessionToken = readCookie(request.headers.cookie, SESSION_COOKIE);
    if (!sessionToken)
      throw new UnauthorizedException('participation access is invalid');
    if (!csrfToken)
      throw new ForbiddenException('participation access proof is invalid');
    return { sessionToken, csrfToken };
  }
}

function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return undefined;
}

function throwAccessHttpError(error: unknown): never {
  if (error instanceof ParticipationAccessRateLimitExceededError) {
    throw new HttpException(
      'participation access is temporarily limited',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (error instanceof ParticipationAccessRateLimitUnavailableError) {
    throw new ServiceUnavailableException(
      'participation access is unavailable',
    );
  }
  if (error instanceof ParticipationAccessNotConfiguredError) {
    throw new ServiceUnavailableException(
      'participation access is unavailable',
    );
  }
  if (error instanceof ParticipationAccessCsrfDeniedError) {
    throw new ForbiddenException('participation access proof is invalid');
  }
  if (
    error instanceof ParticipationAccessConflictError ||
    error instanceof ParticipationAccessUnavailableError
  ) {
    throw new ConflictException(error.message);
  }
  if (
    error instanceof InvalidParticipationAccessTokenError ||
    error instanceof ParticipationAccessInvalidError ||
    error instanceof ParticipationAccessSessionInvalidError
  ) {
    throw new UnauthorizedException('participation access is invalid');
  }
  throw error;
}

function throwCapabilityMutationHttpError(error: unknown): never {
  if (
    error instanceof ParticipationAccessCsrfDeniedError ||
    error instanceof ParticipationAccessSessionInvalidError
  ) {
    throwAccessHttpError(error);
  }
  if (
    error instanceof VoteNotFoundError ||
    error instanceof VoteDetailNotFoundError ||
    error instanceof ElectorNotFoundError ||
    error instanceof CandidateNotFoundError ||
    error instanceof FieldVotingSessionNotFoundError ||
    hasErrorName(error, 'ElectorSignatureObjectNotFoundError')
  ) {
    throw new NotFoundException('participation resource was not found');
  }
  if (
    error instanceof ParticipationSignatureRequiredError ||
    hasErrorName(error, 'ElectorSignatureMetadataMismatchError') ||
    error instanceof DomainError ||
    isUniqueConstraintError(error)
  ) {
    throw new ConflictException(
      error instanceof Error ? error.message : 'participation conflict',
    );
  }
  throw error;
}

function hasErrorName(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name;
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    readonly code?: unknown;
    readonly name?: unknown;
  };
  return (
    candidate.code === '23505' ||
    candidate.name === 'UniqueConstraintViolationException'
  );
}
