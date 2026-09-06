import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

describe('worker scripts', () => {
  it('uses the Nest compiler in watch mode so decorator metadata is emitted', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts['start:worker:dev']).toBe(
      'nest start --watch --entryFile worker',
    );
    expect(packageJson.scripts['start:worker:prod']).toBe(
      'node dist/src/worker',
    );
  });
});
