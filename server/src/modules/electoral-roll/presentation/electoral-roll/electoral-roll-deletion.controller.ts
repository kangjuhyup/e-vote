import { Controller, Delete, HttpCode, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiNoContentResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { DeleteElectoralRollCommand } from '../../application/command/dto/request/delete-electoral-roll.command';
import { DeleteElectoralRollHandler } from '../../application/command/handler/delete-electoral-roll.handler';
import { ElectoralRollParam } from './dto/manage-electoral-roll-member-request.dto';
import { throwMappedElectoralRollError } from './electoral-roll-error.mapper';
@ApiTags('electoral-rolls')
@Controller('electoral-rolls')
export class ElectoralRollDeletionController {
  constructor(private readonly handler: DeleteElectoralRollHandler) {}
  @Delete(':electoralRollId')
  @HttpCode(204)
  @ApiOperation({
    summary: '선거인명부 삭제',
    description:
      '접근 권한이 있는 명부를 삭제합니다. 기존 투표의 명부 스냅샷은 보존됩니다.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: '접근 가능한 명부를 찾을 수 없습니다.' })
  async deleteElectoralRoll(
    @User() user: UserPrincipal,
    @Param() params: ElectoralRollParam,
  ): Promise<void> {
    try {
      await this.handler.execute(
        DeleteElectoralRollCommand.of({
          ...params,
          userPrincipalId: user.id,
          changedAt: new Date(),
        }),
      );
    } catch (error) {
      throwMappedElectoralRollError(error);
    }
  }
}
