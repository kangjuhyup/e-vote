import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import type { UserPrincipal } from '../../../../shared/application/security/user-principal';
import {
  VoteContentChangeAccessDeniedError,
  VoteContentChangeNotFoundError,
  VoteContentChangeWorkflow,
} from '../../application/command/vote-content-change.workflow';
import {
  RejectVoteContentChangeBody,
  RequestVoteContentChangeFileUploadBody,
  SubmitVoteContentChangeBody,
} from './dto/vote-content-change-request.dto';

@ApiTags('vote-content-changes')
@Controller()
export class VoteContentChangeController {
  constructor(private readonly workflow: VoteContentChangeWorkflow) {}

  @Post('votes/:voteId/content-change-files/upload-url')
  @HttpCode(200)
  uploadUrl(
    @User() user: UserPrincipal,
    @Param('voteId', ParseUUIDPipe) voteId: string,
    @Body() body: RequestVoteContentChangeFileUploadBody,
  ) {
    return this.map(() =>
      this.workflow.requestFileUpload(user, { voteId, ...body }),
    );
  }

  @Post('votes/:voteId/content-change-files/:fileId/confirm')
  @HttpCode(200)
  confirmFile(
    @User() user: UserPrincipal,
    @Param('voteId', ParseUUIDPipe) voteId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.map(() => this.workflow.confirmFile(user, voteId, fileId));
  }

  @Get('votes/:voteId/content-change-files/:fileId/download-url')
  downloadFile(
    @User() user: UserPrincipal,
    @Param('voteId', ParseUUIDPipe) voteId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.map(() => this.workflow.getFileDownload(user, voteId, fileId));
  }

  @Post('votes/:voteId/content-changes')
  submit(
    @User() user: UserPrincipal,
    @Param('voteId', ParseUUIDPipe) voteId: string,
    @Body() body: SubmitVoteContentChangeBody,
  ) {
    return this.map(() =>
      this.workflow.submit(user, {
        voteId,
        reason: body.reason,
        documentFileId: body.documentFileId,
        proposal: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.endedAt !== undefined ? { endedAt: body.endedAt } : {}),
          attachmentChanges: body.attachmentChanges,
        },
      }),
    );
  }

  @Get('votes/:voteId/content-changes')
  listMine(
    @User() user: UserPrincipal,
    @Param('voteId', ParseUUIDPipe) voteId: string,
  ) {
    return this.map(() => this.workflow.listMine(user, voteId));
  }

  @Get('vote-content-changes/:requestId')
  getRequest(
    @User() user: UserPrincipal,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.map(() => this.workflow.getRequest(user, requestId));
  }

  @Get('admin/vote-content-changes')
  listAdmin(@User() user: UserPrincipal) {
    return this.map(() => this.workflow.listForAdmin(user));
  }

  @Post('admin/vote-content-changes/:requestId/approve')
  @HttpCode(200)
  approve(
    @User() user: UserPrincipal,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.map(() =>
      this.workflow.review(user, { requestId, decision: 'APPROVED' }),
    );
  }

  @Post('admin/vote-content-changes/:requestId/reject')
  @HttpCode(200)
  reject(
    @User() user: UserPrincipal,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() body: RejectVoteContentChangeBody,
  ) {
    return this.map(() =>
      this.workflow.review(user, {
        requestId,
        decision: 'REJECTED',
        reason: body.reason,
      }),
    );
  }

  private async map<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof VoteContentChangeAccessDeniedError) {
        throw new ForbiddenException();
      }
      if (error instanceof VoteContentChangeNotFoundError) {
        throw new NotFoundException();
      }
      throw error;
    }
  }
}
