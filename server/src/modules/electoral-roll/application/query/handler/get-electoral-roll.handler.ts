import { Inject, Injectable } from '@nestjs/common';
import { ElectoralRollNotFoundError } from '../../command/electoral-roll.error';
import { GetElectoralRollQuery } from '../dto/request/get-electoral-roll.query';
import type { ElectoralRollView } from '../dto/response/electoral-roll.view';
import {
  ELECTORAL_ROLL_READ_REPOSITORY_PORT,
  type ElectoralRollReadRepositoryPort,
} from '../../port/persistence/query/electoral-roll-read-repository.port';

@Injectable()
export class GetElectoralRollHandler {
  constructor(
    @Inject(ELECTORAL_ROLL_READ_REPOSITORY_PORT)
    private readonly repository: ElectoralRollReadRepositoryPort,
  ) {}

  async execute(query: GetElectoralRollQuery): Promise<ElectoralRollView> {
    const electoralRoll = await this.repository.findDetailById(
      query.electoralRollId,
      query.userPrincipalId,
    );
    if (!electoralRoll) throw new ElectoralRollNotFoundError();
    return electoralRoll;
  }
}
