export type EncryptedPersonalDataField = {
  readonly hashProperty?: string;
  readonly propertyKey: string;
};

const ENCRYPTED_PERSONAL_DATA_FIELDS = Symbol('ENCRYPTED_PERSONAL_DATA_FIELDS');

type EncryptedPersonalDataConstructor = {
  [ENCRYPTED_PERSONAL_DATA_FIELDS]?: readonly EncryptedPersonalDataField[];
  readonly prototype: object;
};

export function EncryptedPersonalData(
  options: {
    readonly hashProperty?: string;
  } = {},
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    const constructor = target.constructor as EncryptedPersonalDataConstructor;
    const normalizedPropertyKey = String(propertyKey);
    const existingFields = constructor[ENCRYPTED_PERSONAL_DATA_FIELDS] ?? [];
    const nextFields = [
      ...existingFields.filter(
        (field) => field.propertyKey !== normalizedPropertyKey,
      ),
      {
        hashProperty: options.hashProperty,
        propertyKey: normalizedPropertyKey,
      },
    ];

    Object.defineProperty(constructor, ENCRYPTED_PERSONAL_DATA_FIELDS, {
      configurable: true,
      value: nextFields,
    });
  };
}

export function getEncryptedPersonalDataFields(
  value: object,
): readonly EncryptedPersonalDataField[] {
  const fields: EncryptedPersonalDataField[] = [];
  let constructor = value.constructor as EncryptedPersonalDataConstructor;

  while (constructor !== Object) {
    fields.unshift(...(constructor[ENCRYPTED_PERSONAL_DATA_FIELDS] ?? []));

    const prototype = Object.getPrototypeOf(constructor.prototype) as
      { constructor?: EncryptedPersonalDataConstructor } | undefined;
    const nextConstructor = prototype?.constructor;
    if (nextConstructor === undefined) {
      break;
    }

    constructor = nextConstructor;
  }

  return fields;
}
