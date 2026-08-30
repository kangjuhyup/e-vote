import { MODULE_METADATA } from '@nestjs/common/constants';
import { GetVoteResultHandler } from '../src/modules/participation/application/query/handler/get-vote-result.handler';
import { GetVoteTurnoutHandler } from '../src/modules/participation/application/query/handler/get-vote-turnout.handler';
import { AppModule } from '../src/app.module';
import { VoteStatisticsController } from '../src/modules/participation/presentation/vote-statistics/vote-statistics.controller';

describe('AppModule', () => {
  it('registers vote statistics query endpoints and handlers', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      AppModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AppModule,
    ) as unknown[];

    expect(controllers).toContain(VoteStatisticsController);
    expect(providers).toContain(GetVoteTurnoutHandler);
    expect(providers).toContain(GetVoteResultHandler);
  });
});
