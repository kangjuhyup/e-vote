import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AddElectoralRollMembersCommand } from '../../application/command/dto/request/add-electoral-roll-members.command';
import { CreateElectoralRollCommand } from '../../application/command/dto/request/create-electoral-roll.command';
import { RemoveElectoralRollMemberCommand } from '../../application/command/dto/request/remove-electoral-roll-member.command';
import { UpdateElectoralRollMemberCommand } from '../../application/command/dto/request/update-electoral-roll-member.command';
import { AddElectoralRollMembersHandler } from '../../application/command/handler/add-electoral-roll-members.handler';
import { CreateElectoralRollHandler } from '../../application/command/handler/create-electoral-roll.handler';
import { RemoveElectoralRollMemberHandler } from '../../application/command/handler/remove-electoral-roll-member.handler';
import { UpdateElectoralRollMemberHandler } from '../../application/command/handler/update-electoral-roll-member.handler';
import { throwMappedElectoralRollError } from './electoral-roll-error.mapper';
import { CreateElectoralRollBody } from './dto/create-electoral-roll-request.dto';
import { CreateElectoralRollResponse } from './dto/create-electoral-roll-response.dto';
import { AddElectoralRollMembersBody } from './dto/add-electoral-roll-members-request.dto';
import { AddElectoralRollMembersResponse } from './dto/add-electoral-roll-members-response.dto';
import {
  ElectoralRollMemberParam,
  ElectoralRollParam,
  UpdateElectoralRollMemberBody,
} from './dto/manage-electoral-roll-member-request.dto';
import {
  ManageElectoralRollMemberResponse,
  RemoveElectoralRollMemberResponse,
} from './dto/manage-electoral-roll-member-response.dto';

@ApiTags('electoral-rolls')
@Controller('electoral-rolls')
export class ElectoralRollController {
  constructor(
    private readonly createElectoralRollHandler: CreateElectoralRollHandler,
    private readonly addMembersHandler: AddElectoralRollMembersHandler,
    private readonly updateMemberHandler: UpdateElectoralRollMemberHandler,
    private readonly removeMemberHandler: RemoveElectoralRollMemberHandler,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: CreateElectoralRollResponse })
  async createElectoralRoll(
    @User() user: UserPrincipal,
    @Body() body: CreateElectoralRollBody,
  ): Promise<CreateElectoralRollResponse> {
    try {
      return CreateElectoralRollResponse.of(
        await this.createElectoralRollHandler.execute(
          CreateElectoralRollCommand.of({ ...body, createdAt: new Date() }),
        ),
      );
    } catch (error) {
      throwMappedElectoralRollError(error);
    }
  }

  @Put(':electoralRollId/members')
  @HttpCode(201)
  @ApiCreatedResponse({ type: AddElectoralRollMembersResponse })
  async addMembers(
    @User() user: UserPrincipal,
    @Param() params: ElectoralRollParam,
    @Body() body: AddElectoralRollMembersBody,
  ): Promise<AddElectoralRollMembersResponse> {
    try {
      return AddElectoralRollMembersResponse.of(
        await this.addMembersHandler.execute(
          AddElectoralRollMembersCommand.of({
            electoralRollId: params.electoralRollId,
            members: body.members,
            changedAt: new Date(),
          }),
        ),
      );
    } catch (error) {
      throwMappedElectoralRollError(error);
    }
  }

  @Patch(':electoralRollId/members/:memberId')
  @ApiOkResponse({ type: ManageElectoralRollMemberResponse })
  async updateMember(
    @User() user: UserPrincipal,
    @Param() params: ElectoralRollMemberParam,
    @Body() body: UpdateElectoralRollMemberBody,
  ): Promise<ManageElectoralRollMemberResponse> {
    try {
      return ManageElectoralRollMemberResponse.of(
        await this.updateMemberHandler.execute(
          UpdateElectoralRollMemberCommand.of({
            ...params,
            ...body,
            changedAt: new Date(),
          }),
        ),
      );
    } catch (error) {
      throwMappedElectoralRollError(error);
    }
  }

  @Delete(':electoralRollId/members/:memberId')
  @ApiOkResponse({ type: RemoveElectoralRollMemberResponse })
  async removeMember(
    @User() user: UserPrincipal,
    @Param() params: ElectoralRollMemberParam,
  ): Promise<RemoveElectoralRollMemberResponse> {
    try {
      return RemoveElectoralRollMemberResponse.of(
        await this.removeMemberHandler.execute(
          RemoveElectoralRollMemberCommand.of({
            ...params,
            changedAt: new Date(),
          }),
        ),
      );
    } catch (error) {
      throwMappedElectoralRollError(error);
    }
  }
}
