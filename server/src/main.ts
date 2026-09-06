import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { RvlogHttpExceptionLogger } from './platform/logging/rvlog-http-exception.logger';
import { configureSwagger } from './platform/openapi/swagger.config';
import { HttpExceptionFilter } from './shared/presentation/common/filter/http-exception.filter';
import { ResponseInterceptor } from './shared/presentation/common/interceptor/response.interceptor';
import { resolveParticipationAllowedOrigins } from './modules/participation/infrastructure/security/participation-access-token.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.useBodyParser('json', { limit: '32mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '100kb' });
  app.enableCors({
    origin: [...resolveParticipationAllowedOrigins(process.env)],
    credentials: true,
  });
  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter(new RvlogHttpExceptionLogger()));
  configureSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
