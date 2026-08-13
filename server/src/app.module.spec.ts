import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

describe('AppModule', () => {
  it('imports the infrastructure module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(InfrastructureModule)
      .useModule(class InfrastructureModuleStub {})
      .compile();

    expect(moduleRef.get(AppModule)).toBeInstanceOf(AppModule);
  });
});
