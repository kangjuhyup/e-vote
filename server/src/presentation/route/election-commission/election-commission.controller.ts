import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateElectionCommissionCommand } from '../../../application/command/create-election-commission.command';
import { CreateElectionCommissionHandler } from '../../../application/command/create-election-commission.handler';
import { RegisterElectionCommissionMemberCommand } from '../../../application/command/register-election-commission-member.command';
import { RegisterElectionCommissionMemberHandler } from '../../../application/command/register-election-commission-member.handler';
import { CreateElectionCommissionBody } from './dto/create-election-commission-request.dto';
import { CreateElectionCommissionResponse } from './dto/create-election-commission-response.dto';
import {
  RegisterElectionCommissionMemberBody,
  RegisterElectionCommissionMemberParam,
} from './dto/register-election-commission-member-request.dto';
import { RegisterElectionCommissionMemberResponse } from './dto/register-election-commission-member-response.dto';

@ApiTags('election-commissions')
@Controller('election-commissions')
export class ElectionCommissionController {
  constructor(
    private readonly createElectionCommissionHandler: CreateElectionCommissionHandler,
    private readonly registerElectionCommissionMemberHandler: RegisterElectionCommissionMemberHandler,
  ) {}

  @Post()
  @ApiOperation({
    summary: '선거관리위원회 생성',
    description: '투표를 주관할 선거관리위원회를 활성 상태로 생성합니다.',
  })
  @ApiBody({
    type: CreateElectionCommissionBody,
    description: '생성할 선거관리위원회 정보입니다.',
  })
  @ApiCreatedResponse({
    type: CreateElectionCommissionResponse,
    description: '선거관리위원회 생성 결과입니다.',
  })
  async createElectionCommission(
    @Body() body: CreateElectionCommissionBody,
  ): Promise<CreateElectionCommissionResponse> {
    const result = await this.createElectionCommissionHandler.execute(
      CreateElectionCommissionCommand.of({
        name: body.name,
        createdAt: new Date(),
      }),
    );

    return CreateElectionCommissionResponse.of(result);
  }

  @Post(':commissionId/members')
  @ApiOperation({
    summary: '선거관리위원 등록',
    description: '선거관리위원회에 관리자 또는 현장 관리자 위원을 등록합니다.',
  })
  @ApiParam({
    name: 'commissionId',
    example: 'commission-1',
    description: '위원을 등록할 선거관리위원회 ID입니다.',
  })
  @ApiBody({
    type: RegisterElectionCommissionMemberBody,
    description: '등록할 선거관리위원 정보입니다.',
  })
  @ApiCreatedResponse({
    type: RegisterElectionCommissionMemberResponse,
    description: '선거관리위원 등록 결과입니다.',
  })
  async registerElectionCommissionMember(
    @Param() params: RegisterElectionCommissionMemberParam,
    @Body() body: RegisterElectionCommissionMemberBody,
  ): Promise<RegisterElectionCommissionMemberResponse> {
    const result = await this.registerElectionCommissionMemberHandler.execute(
      RegisterElectionCommissionMemberCommand.of({
        commissionId: params.commissionId,
        name: body.name,
        role: body.role,
        registeredAt: new Date(),
      }),
    );

    return RegisterElectionCommissionMemberResponse.of(result);
  }
}
