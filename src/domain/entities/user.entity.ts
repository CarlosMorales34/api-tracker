export interface UserProps {
  id: string;
  email: string;
  passwordHash: string | null;
  name: string;
  googleId: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
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
      googleId: null,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Cuenta creada a partir de un login con Google -- sin password propia.
  static createFromGoogle(props: { id: string; email: string; name: string; googleId: string; avatarUrl: string | null }): User {
    const now = new Date();
    return new User({
      id: props.id,
      email: props.email.trim().toLowerCase(),
      passwordHash: null,
      name: props.name.trim() || props.email,
      googleId: props.googleId,
      avatarUrl: props.avatarUrl,
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

  get passwordHash(): string | null {
    return this.props.passwordHash;
  }

  get name(): string {
    return this.props.name;
  }

  get googleId(): string | null {
    return this.props.googleId;
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Vincula una cuenta existente (password) a un google_id -- el correo ya
  // coincidió y Google lo verificó, así que se confía en el vínculo.
  withLinkedGoogleAccount(googleId: string, avatarUrl: string | null): User {
    return new User({ ...this.props, googleId, avatarUrl: avatarUrl ?? this.props.avatarUrl });
  }

  // Shape exposed over HTTP — never includes passwordHash.
  toPublicJSON(): PublicUser {
    return {
      id: this.props.id,
      email: this.props.email,
      name: this.props.name,
      avatarUrl: this.props.avatarUrl,
      createdAt: this.props.createdAt,
    };
  }
}
