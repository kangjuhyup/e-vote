import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTOR_READ_REPOSITORY_PORT,
  type ElectorReadRepositoryPort,
} from '../../application/port/persistence/query/elector-read-repository.port';
import type {
  SmsRecipientAccessPort,
  SmsRecipientPage,
} from '../../../../shared/application/port/capability/sms-recipient-access.port';

@Injectable()
export class ElectorSmsRecipientAccessAdapter implements SmsRecipientAccessPort {
  constructor(
    @Inject(ELECTOR_READ_REPOSITORY_PORT)
    private readonly electorRepository: ElectorReadRepositoryPort,
  ) {}

  async findPage(request: {
    readonly voteId: string;
    readonly page: number;
    readonly pageSize: number;
  }): Promise<SmsRecipientPage> {
    const page = await this.electorRepository.findPage(request);
    return {
      items: page.items.map((elector) => ({
        electorId: elector.id,
        name: elector.name,
        identifier: elector.identifier,
        status: elector.status,
        participated: elector.participated,
      })),
      totalPages: page.totalPages,
    };
  }
}
