import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiNoContentResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import {
  ManageElectionCommissionParam,
  ManageElectionCommissionMemberParam,
  UpdateElectionCommissionMemberBody,
} from './dto/manage-election-commission-request.dto';
import { throwMappedElectionCommissionManagementError } from './election-commission-management-error.mapper';
import { DeleteElectionCommissionHandler } from '../../application/command/handler/delete-election-commission.handler';
import { DeleteElectionCommissionCommand } from '../../application/command/dto/request/delete-election-commission.command';
import { RemoveElectionCommissionMemberHandler } from '../../application/command/handler/remove-election-commission-member.handler';
import { RemoveElectionCommissionMemberCommand } from '../../application/command/dto/request/remove-election-commission-member.command';
import { UpdateElectionCommissionMemberHandler } from '../../application/command/handler/update-election-commission-member.handler';
import { UpdateElectionCommissionMemberCommand } from '../../application/command/dto/request/update-election-commission-member.command';

@ApiTags('election-commissions')
@ApiForbiddenResponse({ description: '활성 관리자 권한이 필요합니다.' })
@ApiNotFoundResponse({ description: '위원회 또는 위원을 찾을 수 없습니다.' })
@ApiConflictResponse({
  description: '마지막 관리자 변경 또는 비활성 위원 변경이 거부되었습니다.',
})
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('election-commissions')
export class ElectionCommissionManagementController {
  constructor(
    private readonly deleteElectionCommissionHandler: DeleteElectionCommissionHandler,
    private readonly removeElectionCommissionMemberHandler: RemoveElectionCommissionMemberHandler,
    private readonly updateElectionCommissionMemberHandler: UpdateElectionCommissionMemberHandler,
  ) {}
  @Delete(':commissionId')
  @HttpCode(204)
  @ApiOperation({
    summary: '위원회 삭제',
    description:
      '활성 관리자만 허용합니다. 삭제 시 기존 투표 기록을 보존합니다.',
  })
  @ApiNoContentResponse()
  async deleteElectionCommission(
    @User() user: UserPrincipal,
    @Param() params: ManageElectionCommissionParam,
  ): Promise<void> {
    try {
      await this.deleteElectionCommissionHandler.execute(
        DeleteElectionCommissionCommand.of({
          ...params,
          userPrincipalId: user.id,
          changedAt: new Date(),
        }),
      );
    } catch (error) {
      throwMappedElectionCommissionManagementError(error);
    }
  }
  @Delete(':commissionId/members/:memberId')
  @HttpCode(204)
  @ApiOperation({
    summary: '위원 삭제',
    description:
      '활성 관리자만 허용합니다. 삭제 시 기존 투표 기록을 보존합니다.',
  })
  @ApiNoContentResponse()
  async removeElectionCommissionMember(
    @User() user: UserPrincipal,
    @Param() params: ManageElectionCommissionMemberParam,
  ): Promise<void> {
    try {
      await this.removeElectionCommissionMemberHandler.execute(
        RemoveElectionCommissionMemberCommand.of({
          ...params,
          userPrincipalId: user.id,
          changedAt: new Date(),
        }),
      );
    } catch (error) {
      throwMappedElectionCommissionManagementError(error);
    }
  }
  @Patch(':commissionId/members/:memberId')
  @HttpCode(204)
  @ApiOperation({
    summary: '위원 수정',
    description:
      '활성 관리자가 위원의 이름과 역할을 수정합니다. 마지막 관리자의 권한 하향은 허용하지 않습니다.',
  })
  @ApiNoContentResponse()
  async updateElectionCommissionMember(
    @User() user: UserPrincipal,
    @Param() params: ManageElectionCommissionMemberParam,
    @Body() body: UpdateElectionCommissionMemberBody,
  ): Promise<void> {
    try {
      await this.updateElectionCommissionMemberHandler.execute(
        UpdateElectionCommissionMemberCommand.of({
          ...params,
          ...body,
          userPrincipalId: user.id,
          changedAt: new Date(),
        }),
      );
    } catch (error) {
      throwMappedElectionCommissionManagementError(error);
    }
  }
}
