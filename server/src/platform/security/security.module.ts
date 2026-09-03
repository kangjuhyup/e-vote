import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IDENTITY_DATA_PROTECTOR_PORT } from '../../shared/application/port/security/identity-data-protector.port';
import { IdentityDataProtectorAdapter } from './identity-data-protector.adapter';
import { AesGcmPersonalDataCipher } from './personal-data-cipher';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [
    {
      provide: IDENTITY_DATA_PROTECTOR_PORT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const configuredSecret = configService.get<string>(
          'PERSONAL_DATA_ENCRYPTION_SECRET',
        );
        const secret =
          configuredSecret?.trim() ||
          (process.env.NODE_ENV === 'test'
            ? 'vote-test-personal-data-encryption-secret'
            : undefined);
        if (secret === undefined || secret.length < 32) {
          throw new Error(
            'PERSONAL_DATA_ENCRYPTION_SECRET must contain at least 32 characters',
          );
        }

        return new IdentityDataProtectorAdapter(
          new AesGcmPersonalDataCipher(secret),
        );
      },
    },
  ],
  exports: [IDENTITY_DATA_PROTECTOR_PORT],
})
export class SecurityModule {}
