describe('bootstrap', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.dontMock('@nestjs/core');
    jest.dontMock('../src/app.module');
  });

  it('enables SIGTERM and SIGINT shutdown hooks before listening', async () => {
    const app = {
      enableShutdownHooks: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
      useGlobalFilters: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      useBodyParser: jest.fn(),
    };
    const create = jest.fn().mockResolvedValue(app);
    class AppModuleStub {}

    jest.doMock('@nestjs/core', () => ({
      NestFactory: {
        create,
      },
    }));
    jest.doMock('../src/app.module', () => ({
      AppModule: AppModuleStub,
    }));

    await jest.isolateModulesAsync(async () => {
      await import('../src/main');
    });
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(create).toHaveBeenCalledWith(AppModuleStub, { bodyParser: false });
    expect(app.useBodyParser.mock.calls).toEqual([
      ['json', { limit: '32mb' }],
      ['urlencoded', { extended: true, limit: '100kb' }],
    ]);
    expect(app.enableShutdownHooks).toHaveBeenCalledWith(['SIGTERM', 'SIGINT']);
    expect(app.enableShutdownHooks.mock.invocationCallOrder[0]).toBeLessThan(
      app.listen.mock.invocationCallOrder[0],
    );
  });
});
