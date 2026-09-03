import { ElectorAggregate } from '../../../domain/elector.aggregate';
import { ElectorStatus } from '../../../../../shared/domain/voting/type/elector-status.type';
import { EncryptedPersonalData } from '../../../../../platform/security/encrypted-personal-data.decorator';
import {
  decryptDecoratedPersonalData,
  encryptDecoratedPersonalData,
} from '../../../../../platform/security/encrypted-personal-data-transformer';
import { PersonalDataCipher } from '../../../../../platform/security/personal-data-cipher';
import { EntityRelationReference } from '../../../../../platform/database/mapper/mapper-relation.type';

export type ElectorPersistence = {
  readonly id: string;
  readonly vote: EntityRelationReference;
  readonly name: string;
  readonly identifier: string;
  readonly phoneNumber: string | null;
  readonly phoneNumberHash: string | null;
  readonly identityNameHash: string | null;
  readonly identityBirthDateHash: string | null;
  readonly birthDate: string | null;
  readonly groupKey: string | null;
  readonly voteWeight: number | string;
  readonly status: ElectorStatus;
};

export type ElectorMapperOptions = {
  readonly identityVerified?: boolean;
  readonly personalDataCipher?: PersonalDataCipher;
};

export type ElectorPersistenceWrite = ElectorPersistence & {
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ElectorPersistenceWriteOptions = {
  readonly now?: Date;
  readonly personalDataCipher: PersonalDataCipher;
};

export class ElectorMapper {
  static toDomain(
    entity: ElectorPersistence,
    options: ElectorMapperOptions = {},
  ): ElectorAggregate {
    const personalData = ElectorPersonalData.of({
      name: entity.name,
      phoneNumber: entity.phoneNumber,
      birthDate: entity.birthDate,
    });
    const decryptedPersonalData =
      options.personalDataCipher === undefined
        ? personalData
        : decryptDecoratedPersonalData(
            personalData,
            options.personalDataCipher,
          );

    return ElectorAggregate.reconstitute({
      id: entity.id,
      voteId: entity.vote.id,
      name: decryptedPersonalData.name,
      identifier: entity.identifier,
      phoneNumber: decryptedPersonalData.phoneNumber ?? undefined,
      birthDate: decryptedPersonalData.birthDate ?? undefined,
      groupKey: entity.groupKey ?? undefined,
      voteWeight: Number(entity.voteWeight),
      status: entity.status,
      identityVerified: options.identityVerified ?? false,
      identityNameHash: entity.identityNameHash ?? undefined,
      identityPhoneNumberHash: entity.phoneNumberHash ?? undefined,
      identityBirthDateHash: entity.identityBirthDateHash ?? undefined,
    });
  }

  static toPersistence(
    elector: ElectorAggregate,
    options: ElectorPersistenceWriteOptions,
  ): ElectorPersistenceWrite {
    const now = options.now ?? new Date();
    const encryptedPersonalData = encryptDecoratedPersonalData(
      ElectorPersonalData.of({
        name: elector.name,
        phoneNumber: elector.phoneNumber ?? null,
        birthDate: elector.birthDate ?? null,
      }),
      options.personalDataCipher,
    );

    return {
      id: elector.id,
      vote: { id: elector.voteId },
      name: encryptedPersonalData.name,
      identifier: elector.identifier,
      phoneNumber: encryptedPersonalData.phoneNumber,
      phoneNumberHash: encryptedPersonalData.phoneNumberHash,
      identityNameHash: options.personalDataCipher.hash(elector.name),
      identityBirthDateHash:
        elector.birthDate === undefined
          ? null
          : options.personalDataCipher.hash(elector.birthDate),
      birthDate: encryptedPersonalData.birthDate,
      groupKey: elector.groupKey ?? null,
      voteWeight: elector.voteWeight,
      status: elector.status,
      createdAt: now,
      updatedAt: now,
    };
  }
}

class ElectorPersonalData {
  @EncryptedPersonalData()
  readonly name: string;

  @EncryptedPersonalData({ hashProperty: 'phoneNumberHash' })
  readonly phoneNumber: string | null;

  readonly phoneNumberHash: string | null;

  @EncryptedPersonalData()
  readonly birthDate: string | null;

  private constructor(params: {
    readonly name: string;
    readonly phoneNumber: string | null;
    readonly phoneNumberHash?: string | null;
    readonly birthDate: string | null;
  }) {
    this.name = params.name;
    this.phoneNumber = params.phoneNumber;
    this.phoneNumberHash = params.phoneNumberHash ?? null;
    this.birthDate = params.birthDate;
  }

  static of(params: {
    readonly name: string;
    readonly phoneNumber: string | null;
    readonly phoneNumberHash?: string | null;
    readonly birthDate: string | null;
  }): ElectorPersonalData {
    return new ElectorPersonalData(params);
  }
}
