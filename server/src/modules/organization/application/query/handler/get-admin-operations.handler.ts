import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_OPERATIONS_READ_REPOSITORY_PORT,
  type AdminOperationsReadRepositoryPort,
} from '../../port/persistence/admin-operations-read-repository.port';

@Injectable()
export class GetAdminOperationsHandler {
  constructor(
    @Inject(ADMIN_OPERATIONS_READ_REPOSITORY_PORT)
    private readonly repository: AdminOperationsReadRepositoryPort,
  ) {}

  execute(tenantId: string) {
    return this.repository.getOverview(tenantId);
  }

  getOrdersPage(input: {
    tenantId: string;
    page: number;
    pageSize: number;
    organizationId?: string;
    status?: string;
  }) {
    return this.repository.getOrdersPage(input);
  }
}
