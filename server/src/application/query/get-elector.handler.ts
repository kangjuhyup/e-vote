import { Inject, Injectable } from '@nestjs/common';
import { ELECTOR_READ_REPOSITORY_PORT } from '../port/elector-read-repository.port';
import type { ElectorReadRepositoryPort } from '../port/elector-read-repository.port';
import { GetElectorQuery } from './get-elector.query';
import type { ElectorView } from './elector.view';

export class ElectorNotFoundError extends Error {
  constructor() {
    super('elector not found');
  }
}

@Injectable()
export class GetElectorHandler {
  constructor(
    @Inject(ELECTOR_READ_REPOSITORY_PORT)
    private readonly electorReadRepository: ElectorReadRepositoryPort,
  ) {}

  async execute(query: GetElectorQuery): Promise<ElectorView> {
    const elector = await this.electorReadRepository.findDetailById(
      query.voteId,
      query.electorId,
    );

    if (!elector) {
      throw new ElectorNotFoundError();
    }

    return elector;
  }
}
