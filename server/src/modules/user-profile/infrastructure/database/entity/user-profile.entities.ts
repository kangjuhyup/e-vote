import type { DatabaseEntityFactoryContext } from '../../../../../platform/database/entity/entity-factory-context';

export function createUserProfileEntities(
  context: DatabaseEntityFactoryContext,
): Partial<
  import('../../../../../platform/database/entity/entity-factory-context').DatabaseEntityClasses
> {
  const { defineEntity, p } = context;
  const schema = defineEntity({
    name: 'UserProfileEntity',
    tableName: 'user_profiles',
    uniques: [
      {
        name: 'user_profiles_tenant_principal_unique',
        properties: ['tenantCode', 'userPrincipalId'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      tenantCode: p.string().fieldName('tenant_code'),
      userPrincipalId: p.string().fieldName('user_principal_id'),
      name: p.string(),
      email: p.string(),
      phone: p.string(),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
    },
  });
  class UserProfileEntity extends schema.class {}
  schema.setClass(UserProfileEntity);
  return { UserProfileEntity };
}
