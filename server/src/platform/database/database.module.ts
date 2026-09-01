import {
  type DynamicModule,
  type InjectionToken,
  Module,
  type Provider,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  databaseTransactionPortTokens,
  databaseTransactionProviders,
} from './database-transaction.providers';
import {
  createDatabaseConfig,
  type DatabaseEntityRegistryFactory,
} from './database.config';
import { configureDatabaseEntityRegistryFactory } from './repository/database-repository.util';
import { DATABASE_HEALTH_PORT } from '../../shared/application/port/health/database-health.port';
import { MikroOrmDatabaseHealthAdapter } from './mikro-orm-database-health.adapter';

export interface DatabaseModuleOptions {
  readonly entityRegistryFactory: DatabaseEntityRegistryFactory;
  readonly repositoryProviders?: readonly Provider[];
  readonly repositoryPortTokens?: readonly InjectionToken[];
}

@Module({})
export class DatabaseModule {
  static async register(
    options: DatabaseModuleOptions,
  ): Promise<DynamicModule> {
    configureDatabaseEntityRegistryFactory(options.entityRegistryFactory);
    const [{ MikroOrmModule }, { PostgreSqlDriver }] = await Promise.all([
      import('@mikro-orm/nestjs'),
      import('@mikro-orm/postgresql'),
    ]);

    const configModule = ConfigModule.forRoot({
      isGlobal: true,
    });

    const mikroOrmModule = await MikroOrmModule.forRootAsync({
      imports: [configModule],
      inject: [ConfigService],
      driver: PostgreSqlDriver,
      useFactory: (configService: ConfigService) =>
        createDatabaseConfig(
          {
            DATABASE_HOST: configService.get<string>('DATABASE_HOST'),
            DATABASE_PORT: configService.get<string>('DATABASE_PORT'),
            DATABASE_NAME: configService.get<string>('DATABASE_NAME'),
            DATABASE_USER: configService.get<string>('DATABASE_USER'),
            DATABASE_PASSWORD: configService.get<string>('DATABASE_PASSWORD'),
            DATABASE_SSL: configService.get<string>('DATABASE_SSL'),
          },
          options.entityRegistryFactory,
        ),
    });

    return {
      module: DatabaseModule,
      imports: [configModule, mikroOrmModule],
      providers: [
        {
          provide: DATABASE_HEALTH_PORT,
          useClass: MikroOrmDatabaseHealthAdapter,
        },
        ...(options.repositoryProviders ?? []),
        ...databaseTransactionProviders,
      ],
      exports: [
        DATABASE_HEALTH_PORT,
        ...(options.repositoryPortTokens ?? []),
        ...databaseTransactionPortTokens,
      ],
    };
  }
}
