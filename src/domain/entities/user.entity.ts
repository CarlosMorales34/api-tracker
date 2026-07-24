export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: { id: string; email: string; passwordHash: string; name: string }): User {
    if (!props.email.trim()) {
      throw new Error('User email cannot be empty');
    }
    if (!props.name.trim()) {
      throw new Error('User name cannot be empty');
    }

    const now = new Date();
    return new User({
      id: props.id,
      email: props.email.trim().toLowerCase(),
      passwordHash: props.passwordHash,
      name: props.name.trim(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get name(): string {
    return this.props.name;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Shape exposed over HTTP — never includes passwordHash.
  toPublicJSON(): PublicUser {
    return {
      id: this.props.id,
      email: this.props.email,
      name: this.props.name,
      createdAt: this.props.createdAt,
    };
  }
}
