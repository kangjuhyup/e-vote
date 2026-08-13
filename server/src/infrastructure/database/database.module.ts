import { type DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  databaseRepositoryPortTokens,
  databaseRepositoryProviders,
} from './database-repository.providers';
import {
  databaseTransactionPortTokens,
  databaseTransactionProviders,
} from './database-transaction.providers';
import { createDatabaseConfig } from './database.config';

@Module({})
export class DatabaseModule {
  static async register(): Promise<DynamicModule> {
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
        createDatabaseConfig({
          DATABASE_HOST: configService.get<string>('DATABASE_HOST'),
          DATABASE_PORT: configService.get<string>('DATABASE_PORT'),
          DATABASE_NAME: configService.get<string>('DATABASE_NAME'),
          DATABASE_USER: configService.get<string>('DATABASE_USER'),
          DATABASE_PASSWORD: configService.get<string>('DATABASE_PASSWORD'),
          DATABASE_SSL: configService.get<string>('DATABASE_SSL'),
        }),
    });

    return {
      module: DatabaseModule,
      imports: [configModule, mikroOrmModule],
      providers: [
        ...databaseRepositoryProviders,
        ...databaseTransactionProviders,
      ],
      exports: [
        ...databaseRepositoryPortTokens,
        ...databaseTransactionPortTokens,
      ],
    };
  }
}
