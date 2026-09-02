import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTORAL_ROLL_READ_REPOSITORY_PORT,
  type ElectoralRollReadRepositoryPort,
} from '../../port/persistence/query/electoral-roll-read-repository.port';
import { GetElectoralRollPageQuery } from '../dto/request/get-electoral-roll-page.query';
import type { ElectoralRollPageView } from '../dto/response/electoral-roll.view';

@Injectable()
export class GetElectoralRollPageHandler {
  constructor(
    @Inject(ELECTORAL_ROLL_READ_REPOSITORY_PORT)
    private readonly repository: ElectoralRollReadRepositoryPort,
  ) {}

  execute(query: GetElectoralRollPageQuery): Promise<ElectoralRollPageView> {
    return this.repository.findPage({
      userPrincipalId: query.userPrincipalId,
      query: query.query,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
