import { Inject, Injectable } from '@nestjs/common';
import { ELECTOR_READ_REPOSITORY_PORT } from '../../port/persistence/query/elector-read-repository.port';
import type { ElectorReadRepositoryPort } from '../../port/persistence/query/elector-read-repository.port';
import { GetElectorPageQuery } from '../dto/request/get-elector-page.query';
import type { ElectorPageView } from '../dto/response/elector.view';

@Injectable()
export class GetElectorPageHandler {
  constructor(
    @Inject(ELECTOR_READ_REPOSITORY_PORT)
    private readonly electorReadRepository: ElectorReadRepositoryPort,
  ) {}

  execute(query: GetElectorPageQuery): Promise<ElectorPageView> {
    return this.electorReadRepository.findPage({
      voteId: query.voteId,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
