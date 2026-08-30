import {
  Body,
  ConflictException,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Put,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticateElectorCommand } from '../../../application/command/dto/request/authenticate-elector.command';
import { AuthenticateElectorHandler } from '../../../application/command/handler/authenticate-elector.handler';
import { CreateElectorCommand } from '../../../application/command/dto/request/create-elector.command';
import { CreateElectorHandler } from '../../../application/command/handler/create-elector.handler';
import { DomainError } from '../../../domain/shared/domain-error';
import {
  AuthenticateElectorBody,
  AuthenticateElectorParam,
} from './dto/authenticate-elector-request.dto';
import { AuthenticateElectorResponse } from './dto/authenticate-elector-response.dto';
import {
  CreateElectorBody,
  CreateElectorParam,
} from './dto/create-elector-request.dto';
import { CreateElectorResponse } from './dto/create-elector-response.dto';
import { UpdateElectorCommand } from '../../../application/command/dto/request/update-elector.command';
import { BlockElectorCommand } from '../../../application/command/dto/request/block-elector.command';
import { UpdateElectorHandler } from '../../../application/command/handler/update-elector.handler';
import { BlockElectorHandler } from '../../../application/command/handler/block-elector.handler';
import {
  ManageElectorParam,
  UpdateElectorBody,
} from './dto/manage-elector-request.dto';
import { ManageElectorResponse } from './dto/manage-elector-response.dto';

@ApiTags('electors')
@Controller('votes/:voteId/electors')
export class ElectorController {
  constructor(
    private readonly createElectorHandler: CreateElectorHandler,
    private readonly authenticateElectorHandler: AuthenticateElectorHandler,
    private readonly updateElectorHandler?: UpdateElectorHandler,
    private readonly blockElectorHandler?: BlockElectorHandler,
  ) {}

  @Put()
  @HttpCode(201)
  @ApiOperation({
    summary: '선거인 생성',
    description: '부모 투표에 참여 가능한 선거인을 등록합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '선거인을 등록할 부모 투표 ID입니다.',
  })
  @ApiBody({
    type: CreateElectorBody,
    description: '생성할 선거인 정보입니다.',
  })
  @ApiCreatedResponse({
    type: CreateElectorResponse,
    description: '선거인 생성 결과입니다.',
  })
  @ApiConflictResponse({
    description: '같은 그룹 선거인의 지분이 기존 그룹 지분과 다릅니다.',
  })
  async createElector(
    @Param() params: CreateElectorParam,
    @Body() body: CreateElectorBody,
  ): Promise<CreateElectorResponse> {
    try {
      const result = await this.createElectorHandler.execute(
        CreateElectorCommand.of({
          voteId: params.voteId,
          name: body.name,
          identifier: body.identifier,
          phoneNumber: body.phoneNumber,
          birthDate: body.birthDate,
          groupKey: body.groupKey,
          voteWeight: body.voteWeight,
        }),
      );

      return CreateElectorResponse.of(result);
    } catch (error) {
      if (error instanceof DomainError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Patch(':electorId')
  async updateElector(
    @Param() params: ManageElectorParam,
    @Body() body: UpdateElectorBody,
  ) {
    return ManageElectorResponse.of(
      await this.updateElectorHandler!.execute(
        UpdateElectorCommand.of({ ...params, ...body }),
      ),
    );
  }

  @Delete(':electorId')
  async deleteElector(@Param() params: ManageElectorParam) {
    return ManageElectorResponse.of(
      await this.blockElectorHandler!.execute(BlockElectorCommand.of(params)),
    );
  }

  @Put(':electorId/authentication')
  @ApiOperation({
    summary: '선거인 본인인증',
    description:
      '선거인 본인인증 제공자의 인증 거래를 확인하고 선거인을 인증 완료 상태로 표시합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '선거인이 속한 부모 투표 ID입니다.',
  })
  @ApiParam({
    name: 'electorId',
    example: 'elector-1',
    description: '본인인증할 선거인 ID입니다.',
  })
  @ApiBody({
    type: AuthenticateElectorBody,
    description: '선거인 본인인증 확인 정보입니다.',
  })
  @ApiOkResponse({
    type: AuthenticateElectorResponse,
    description: '선거인 본인인증 결과입니다.',
  })
  async authenticateElector(
    @Param() params: AuthenticateElectorParam,
    @Body() body: AuthenticateElectorBody,
  ): Promise<AuthenticateElectorResponse> {
    const result = await this.authenticateElectorHandler.execute(
      AuthenticateElectorCommand.of({
        voteId: params.voteId,
        electorId: params.electorId,
        provider: body.provider,
        transactionId: body.transactionId,
        verifiedAt: new Date(body.verifiedAt),
      }),
    );

    return AuthenticateElectorResponse.of(result);
  }
}
