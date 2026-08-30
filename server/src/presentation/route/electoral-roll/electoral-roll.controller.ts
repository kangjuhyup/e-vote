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
import { AddElectoralRollMemberCommand } from '../../../application/command/add-electoral-roll-member.command';
import { CreateElectoralRollCommand } from '../../../application/command/create-electoral-roll.command';
import { CreateElectoralRollSnapshotCommand } from '../../../application/command/create-electoral-roll-snapshot.command';
import { RemoveElectoralRollMemberCommand } from '../../../application/command/remove-electoral-roll-member.command';
import { UpdateElectoralRollMemberCommand } from '../../../application/command/update-electoral-roll-member.command';
import { AddElectoralRollMemberHandler } from '../../../application/command/handler/add-electoral-roll-member.handler';
import { CreateElectoralRollHandler } from '../../../application/command/handler/create-electoral-roll.handler';
import { CreateElectoralRollSnapshotHandler } from '../../../application/command/handler/create-electoral-roll-snapshot.handler';
import { RemoveElectoralRollMemberHandler } from '../../../application/command/handler/remove-electoral-roll-member.handler';
import { UpdateElectoralRollMemberHandler } from '../../../application/command/handler/update-electoral-roll-member.handler';
import { throwMappedElectoralRollError } from './electoral-roll-error.mapper';
import { CreateElectoralRollBody } from './dto/create-electoral-roll-request.dto';
import { CreateElectoralRollResponse } from './dto/create-electoral-roll-response.dto';
import { CreateElectoralRollSnapshotResponse } from './dto/create-electoral-roll-snapshot-response.dto';
import {
  AddElectoralRollMemberBody,
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
    private readonly addMemberHandler: AddElectoralRollMemberHandler,
    private readonly updateMemberHandler: UpdateElectoralRollMemberHandler,
    private readonly removeMemberHandler: RemoveElectoralRollMemberHandler,
    private readonly createSnapshotHandler: CreateElectoralRollSnapshotHandler,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: CreateElectoralRollResponse })
  async createElectoralRoll(
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
  @ApiCreatedResponse({ type: ManageElectoralRollMemberResponse })
  async addMember(
    @Param() params: ElectoralRollParam,
    @Body() body: AddElectoralRollMemberBody,
  ): Promise<ManageElectoralRollMemberResponse> {
    try {
      return ManageElectoralRollMemberResponse.of(
        await this.addMemberHandler.execute(
          AddElectoralRollMemberCommand.of({
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

  @Patch(':electoralRollId/members/:memberId')
  @ApiOkResponse({ type: ManageElectoralRollMemberResponse })
  async updateMember(
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

  @Post(':electoralRollId/snapshots')
  @ApiCreatedResponse({ type: CreateElectoralRollSnapshotResponse })
  async createSnapshot(
    @Param() params: ElectoralRollParam,
  ): Promise<CreateElectoralRollSnapshotResponse> {
    try {
      return CreateElectoralRollSnapshotResponse.of(
        await this.createSnapshotHandler.execute(
          CreateElectoralRollSnapshotCommand.of({
            ...params,
            createdAt: new Date(),
          }),
        ),
      );
    } catch (error) {
      throwMappedElectoralRollError(error);
    }
  }
}
