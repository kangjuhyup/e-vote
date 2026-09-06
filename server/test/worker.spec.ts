describe('worker bootstrap', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.dontMock('@nestjs/core');
    jest.dontMock('../src/worker.module');
  });

  it('creates a non-HTTP application context with graceful shutdown hooks', async () => {
    const app = {
      enableShutdownHooks: jest.fn(),
    };
    const createApplicationContext = jest.fn().mockResolvedValue(app);
    class WorkerModuleStub {}

    jest.doMock('@nestjs/core', () => ({
      NestFactory: {
        createApplicationContext,
      },
    }));
    jest.doMock('../src/worker.module', () => ({
      WorkerModule: WorkerModuleStub,
    }));

    await jest.isolateModulesAsync(async () => {
      await import('../src/worker');
    });
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(createApplicationContext).toHaveBeenCalledWith(WorkerModuleStub);
    expect(app.enableShutdownHooks).toHaveBeenCalledWith(['SIGTERM', 'SIGINT']);
  });
});
