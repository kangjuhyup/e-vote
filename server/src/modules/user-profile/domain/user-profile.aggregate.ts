export interface UserProfileProps {
  readonly id: string;
  readonly tenantCode: string;
  readonly userPrincipalId: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class UserProfileAggregate {
  private constructor(readonly props: UserProfileProps) {}

  static create(props: UserProfileProps): UserProfileAggregate {
    const name = props.name.trim();
    const email = props.email.trim().toLowerCase();
    const phone = props.phone.trim();
    if (!name || !email || !phone) {
      throw new TypeError('user profile contact fields are required');
    }
    return new UserProfileAggregate({ ...props, name, email, phone });
  }

  static restore(props: UserProfileProps): UserProfileAggregate {
    return new UserProfileAggregate(props);
  }
}
