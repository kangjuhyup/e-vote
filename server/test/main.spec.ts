describe('bootstrap', () => {
  const swaggerConfig = { openapi: '3.0.0' };
  const swaggerDocument = { paths: {} };
  let setTitle: jest.Mock;
  let setDescription: jest.Mock;
  let setVersion: jest.Mock;
  let addBearerAuth: jest.Mock;
  let addSecurityRequirements: jest.Mock;
  let build: jest.Mock;
  let createDocument: jest.Mock;
  let setup: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    const documentBuilder = {} as {
      setTitle: jest.Mock;
      setDescription: jest.Mock;
      setVersion: jest.Mock;
      addBearerAuth: jest.Mock;
      addSecurityRequirements: jest.Mock;
      build: jest.Mock;
    };
    setTitle = jest.fn().mockReturnValue(documentBuilder);
    setDescription = jest.fn().mockReturnValue(documentBuilder);
    setVersion = jest.fn().mockReturnValue(documentBuilder);
    addBearerAuth = jest.fn().mockReturnValue(documentBuilder);
    addSecurityRequirements = jest.fn().mockReturnValue(documentBuilder);
    build = jest.fn().mockReturnValue(swaggerConfig);
    Object.assign(documentBuilder, {
      setTitle,
      setDescription,
      setVersion,
      addBearerAuth,
      addSecurityRequirements,
      build,
    });
    createDocument = jest.fn().mockReturnValue(swaggerDocument);
    setup = jest.fn();
    jest.doMock('@nestjs/swagger', () => ({
      DocumentBuilder: jest.fn().mockImplementation(() => documentBuilder),
      SwaggerModule: { createDocument, setup },
    }));
  });

  afterEach(() => {
    jest.dontMock('@nestjs/core');
    jest.dontMock('@nestjs/swagger');
    jest.dontMock('../src/app.module');
  });

  it('configures OpenAPI and graceful shutdown before listening', async () => {
    const app = {
      enableShutdownHooks: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
      useGlobalFilters: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      useGlobalPipes: jest.fn(),
      useBodyParser: jest.fn(),
      enableCors: jest.fn(),
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
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ['http://localhost:3001'],
      credentials: true,
    });
    expect(app.enableShutdownHooks).toHaveBeenCalledWith(['SIGTERM', 'SIGINT']);
    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(setTitle).toHaveBeenCalledWith('Vote API');
    expect(setDescription).toHaveBeenCalledWith(
      'Electronic voting service API',
    );
    expect(setVersion).toHaveBeenCalledWith('1.0');
    expect(addBearerAuth).toHaveBeenCalledTimes(1);
    expect(addSecurityRequirements).toHaveBeenCalledWith('bearer');
    expect(build).toHaveBeenCalledTimes(1);
    expect(createDocument).toHaveBeenCalledWith(app, swaggerConfig);
    expect(setup).toHaveBeenCalledWith('docs', app, swaggerDocument, {
      jsonDocumentUrl: 'docs-json',
      customSiteTitle: 'Vote API Docs',
    });
    expect(app.enableShutdownHooks.mock.invocationCallOrder[0]).toBeLessThan(
      app.listen.mock.invocationCallOrder[0],
    );
  });
});
