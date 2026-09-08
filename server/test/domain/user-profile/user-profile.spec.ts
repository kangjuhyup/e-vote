import { UserProfileAggregate } from '../../../src/modules/user-profile/domain/user-profile.aggregate';

describe('Vote user profile policy', () => {
  it('requires name, email, and phone', () => {
    const base = {
      id: 'profile-1',
      tenantCode: 'acme',
      userPrincipalId: 'user-1',
      name: '김투표',
      email: 'voter@example.com',
      phone: '+821012345678',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(UserProfileAggregate.create(base).props).toMatchObject(base);
    expect(() => UserProfileAggregate.create({ ...base, name: ' ' })).toThrow(
      'user profile contact fields are required',
    );
  });
});
