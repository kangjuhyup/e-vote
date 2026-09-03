export const IDENTITY_DATA_PROTECTOR_PORT = Symbol(
  'IDENTITY_DATA_PROTECTOR_PORT',
);

export type ProtectedIdentityData = {
  readonly encryptedValue: string;
  readonly hash: string;
};

export interface IdentityDataProtectorPort {
  protectName(value: string): ProtectedIdentityData;
  protectPhoneNumber(value: string): ProtectedIdentityData;
  protectBirthDate(value: string): ProtectedIdentityData;
  reveal(encryptedValue: string): string;
}
