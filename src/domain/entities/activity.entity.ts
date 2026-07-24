export interface ActivityProps {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
}

export class Activity {
  private constructor(private readonly props: ActivityProps) {}

  static create(props: { id: string; categoryId: string; name: string; sortOrder: number }): Activity {
    if (!props.name.trim()) {
      throw new Error('Activity name cannot be empty');
    }
    if (!props.categoryId) {
      throw new Error('Activity categoryId is required');
    }

    return new Activity({ ...props, createdAt: new Date() });
  }

  static fromPersistence(props: ActivityProps): Activity {
    return new Activity(props);
  }

  get id(): string {
    return this.props.id;
  }

  get categoryId(): string {
    return this.props.categoryId;
  }

  get name(): string {
    return this.props.name;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toJSON(): { id: string; categoryId: string; name: string; sortOrder: number } {
    return { id: this.props.id, categoryId: this.props.categoryId, name: this.props.name, sortOrder: this.props.sortOrder };
  }
}
