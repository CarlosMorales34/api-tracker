export interface WorkoutRoutineExerciseProps {
  id: string;
  routineId: string;
  name: string;
  targetSets: number;
  targetReps: number;
  suggestedWeight: number | null;
  sortOrder: number;
}

export class WorkoutRoutineExercise {
  private constructor(private readonly props: WorkoutRoutineExerciseProps) {}

  static fromPersistence(props: WorkoutRoutineExerciseProps): WorkoutRoutineExercise {
    return new WorkoutRoutineExercise(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get targetSets(): number {
    return this.props.targetSets;
  }

  get targetReps(): number {
    return this.props.targetReps;
  }

  get suggestedWeight(): number | null {
    return this.props.suggestedWeight;
  }

  toJSON() {
    return {
      id: this.props.id,
      name: this.props.name,
      targetSets: this.props.targetSets,
      targetReps: this.props.targetReps,
      suggestedWeight: this.props.suggestedWeight,
    };
  }
}

export interface WorkoutRoutineProps {
  id: string;
  userId: string;
  name: string;
  weekday: number | null;
  exercises: WorkoutRoutineExercise[];
}

export class WorkoutRoutine {
  private constructor(private readonly props: WorkoutRoutineProps) {}

  static fromPersistence(props: WorkoutRoutineProps): WorkoutRoutine {
    return new WorkoutRoutine(props);
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

  get weekday(): number | null {
    return this.props.weekday;
  }

  get exercises(): WorkoutRoutineExercise[] {
    return this.props.exercises;
  }

  toJSON() {
    return {
      id: this.props.id,
      name: this.props.name,
      weekday: this.props.weekday,
      exercises: this.props.exercises.map((ex) => ex.toJSON()),
    };
  }
}
