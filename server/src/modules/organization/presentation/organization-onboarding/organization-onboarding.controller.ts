import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { OrganizationOnboardingService } from '../../application/organization-onboarding.service';
import {
  OrganizationApplicationAccessDeniedError,
  OrganizationApplicationConflictError,
  OrganizationApplicationNotFoundError,
  OrganizationProvisioningUnavailableError,
} from '../../application/organization-onboarding.error';
import {
  GetOrganizationApplicationPageQuery,
  OrganizationApplicationResponse,
  RejectOrganizationApplicationBody,
  SubmitOrganizationApplicationBody,
} from './dto/organization-onboarding.dto';

@Controller()
export class OrganizationOnboardingController {
  private readonly logger = new Logger(OrganizationOnboardingController.name);

  constructor(private readonly service: OrganizationOnboardingService) {}

  @Post('organization-applications')
  async submit(
    @User() user: UserPrincipal,
    @Body() body: SubmitOrganizationApplicationBody,
  ) {
    return this.map(() => this.service.submit(user, body));
  }

  @Get('organization-applications/me')
  async getMine(@User() user: UserPrincipal) {
    return this.map(() => this.service.getMine(user));
  }

  @Get('organizations/managed')
  getManagedOrganizations(@User() user: UserPrincipal) {
    return { items: user.managedOrganizations() };
  }

  @Get('organizations/memberships')
  async getMemberships(@User() user: UserPrincipal) {
    const voteAdmin = user.hasTenantRole('vote-admin');
    this.logger.log(
      `organization access resolved userPrincipalId=${user.id} tenantId=${user.tenantId ?? '<none>'} tenantRoles=${user.tenantRoles.map((role) => role.code).join(',') || '<none>'} voteAdmin=${voteAdmin}`,
    );
    return {
      items: await this.service.getMemberships(user),
      voteAdmin,
    };
  }

  @Get('admin/organization-applications')
  async getPage(
    @User() user: UserPrincipal,
    @Query() query: GetOrganizationApplicationPageQuery,
  ) {
    try {
      const page = await this.service.getPage(user, query);
      return {
        ...page,
        items: page.items.map((item) =>
          OrganizationApplicationResponse.of(item),
        ),
      };
    } catch (error) {
      this.throwMapped(error);
    }
  }

  @Post('admin/organization-applications/:id/approve')
  approve(@User() user: UserPrincipal, @Param('id') id: string) {
    return this.map(() => this.service.approve(user, id));
  }

  @Post('admin/organization-applications/:id/retry-provisioning')
  retry(@User() user: UserPrincipal, @Param('id') id: string) {
    return this.map(() => this.service.approve(user, id, true));
  }

  @Post('admin/organization-applications/:id/reject')
  reject(
    @User() user: UserPrincipal,
    @Param('id') id: string,
    @Body() body: RejectOrganizationApplicationBody,
  ) {
    return this.map(() => this.service.reject(user, id, body.rejectionReason));
  }

  private async map(
    operation: () => Promise<
      Parameters<typeof OrganizationApplicationResponse.of>[0]
    >,
  ) {
    try {
      return OrganizationApplicationResponse.of(await operation());
    } catch (error) {
      this.throwMapped(error);
    }
  }

  private throwMapped(error: unknown): never {
    if (error instanceof OrganizationApplicationAccessDeniedError)
      throw new ForbiddenException();
    if (error instanceof OrganizationApplicationNotFoundError)
      throw new NotFoundException();
    if (error instanceof OrganizationApplicationConflictError)
      throw new ConflictException();
    if (error instanceof OrganizationProvisioningUnavailableError)
      throw new ServiceUnavailableException(
        '현재 조직 승인을 처리할 수 없습니다. 관리자에게 문의해 주세요.',
      );
    throw error;
  }
}
