import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { GetAdminOperationsHandler } from '../../application/query/handler/get-admin-operations.handler';
import { GetAdminBillingOrderPageQuery } from './dto/get-admin-billing-order-page-request.dto';

@Controller('admin/operations')
export class AdminOperationsController {
  constructor(private readonly handler: GetAdminOperationsHandler) {}

  @Get('overview')
  getOverview(@User() user: UserPrincipal) {
    return this.handler.execute(this.requireAdminTenant(user));
  }

  @Get('orders')
  getOrdersPage(
    @User() user: UserPrincipal,
    @Query() query: GetAdminBillingOrderPageQuery,
  ) {
    return this.handler.getOrdersPage({
      tenantId: this.requireAdminTenant(user),
      page: Number(query.page),
      pageSize: Number(query.pageSize),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.status ? { status: query.status } : {}),
    });
  }

  private requireAdminTenant(user: UserPrincipal): string {
    if (!user.tenantId || !user.hasTenantRole('vote-admin'))
      throw new ForbiddenException();
    return user.tenantId;
  }
}
