import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetElectoralRollQuery } from '../../application/query/dto/request/get-electoral-roll.query';
import { GetElectoralRollHandler } from '../../application/query/handler/get-electoral-roll.handler';
import { throwMappedElectoralRollError } from './electoral-roll-error.mapper';
import { GetElectoralRollResponse } from './dto/get-electoral-roll-response.dto';
import { ElectoralRollParam } from './dto/manage-electoral-roll-member-request.dto';

@ApiTags('electoral-rolls')
@Controller('electoral-rolls')
export class ElectoralRollReadController {
  constructor(private readonly handler: GetElectoralRollHandler) {}

  @Get(':electoralRollId')
  @ApiOkResponse({ type: GetElectoralRollResponse })
  async getElectoralRoll(
    @User() user: UserPrincipal,
    @Param() params: ElectoralRollParam,
  ): Promise<GetElectoralRollResponse> {
    try {
      return GetElectoralRollResponse.of(
        await this.handler.execute(GetElectoralRollQuery.of(params)),
      );
    } catch (error) {
      throwMappedElectoralRollError(error);
    }
  }
}
