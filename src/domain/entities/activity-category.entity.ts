export interface ActivityCategoryProps {
  id: string;
  userId: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: Date;
}

export class ActivityCategory {
  private constructor(private readonly props: ActivityCategoryProps) {}

  static create(props: { id: string; userId: string; name: string; color: string; sortOrder: number }): ActivityCategory {
    if (!props.name.trim()) {
      throw new Error('ActivityCategory name cannot be empty');
    }
    if (!props.userId) {
      throw new Error('ActivityCategory userId is required');
    }

    return new ActivityCategory({ ...props, createdAt: new Date() });
  }

  static fromPersistence(props: ActivityCategoryProps): ActivityCategory {
    return new ActivityCategory(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get color(): string {
    return this.props.color;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  // El contrato HTTP no expone userId ni createdAt (a diferencia de Metric):
  // el front solo necesita estos 4 campos para pintar la categoría.
  toJSON(): { id: string; name: string; color: string; sortOrder: number } {
    return { id: this.props.id, name: this.props.name, color: this.props.color, sortOrder: this.props.sortOrder };
  }
}
