export type PersonalDataMaskingStrategy =
  'birthDate' | 'default' | 'name' | 'phoneNumber';

export type MaskedPersonalDataField = {
  readonly propertyKey: string;
  readonly strategy: PersonalDataMaskingStrategy;
};

const MASKED_PERSONAL_DATA_FIELDS = Symbol('MASKED_PERSONAL_DATA_FIELDS');

type MaskedPersonalDataConstructor = {
  [MASKED_PERSONAL_DATA_FIELDS]?: readonly MaskedPersonalDataField[];
  readonly prototype: object;
};

export function MaskedPersonalData(
  strategy: PersonalDataMaskingStrategy = 'default',
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    const constructor = target.constructor as MaskedPersonalDataConstructor;
    const normalizedPropertyKey = String(propertyKey);
    const existingFields = constructor[MASKED_PERSONAL_DATA_FIELDS] ?? [];
    const nextFields = [
      ...existingFields.filter(
        (field) => field.propertyKey !== normalizedPropertyKey,
      ),
      {
        propertyKey: normalizedPropertyKey,
        strategy,
      },
    ];

    Object.defineProperty(constructor, MASKED_PERSONAL_DATA_FIELDS, {
      configurable: true,
      value: nextFields,
    });
  };
}

export function getMaskedPersonalDataFields(
  value: object,
): readonly MaskedPersonalDataField[] {
  const fields: MaskedPersonalDataField[] = [];
  let constructor = value.constructor as MaskedPersonalDataConstructor;

  while (constructor !== Object) {
    fields.unshift(...(constructor[MASKED_PERSONAL_DATA_FIELDS] ?? []));

    const prototype = Object.getPrototypeOf(constructor.prototype) as
      { constructor?: MaskedPersonalDataConstructor } | undefined;
    const nextConstructor = prototype?.constructor;
    if (nextConstructor === undefined) {
      break;
    }

    constructor = nextConstructor;
  }

  return fields;
}
