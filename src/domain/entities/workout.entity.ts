export interface WorkoutExerciseProps {
  id: string;
  workoutId: string;
  name: string;
  weight: number | null;
  sets: number;
  reps: number[];
  sortOrder: number;
}

export class WorkoutExercise {
  private constructor(private readonly props: WorkoutExerciseProps) {}

  static fromPersistence(props: WorkoutExerciseProps): WorkoutExercise {
    return new WorkoutExercise(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get weight(): number | null {
    return this.props.weight;
  }

  get sets(): number {
    return this.props.sets;
  }

  get reps(): number[] {
    return this.props.reps;
  }

  get totalReps(): number {
    return this.props.reps.reduce((sum, r) => sum + r, 0);
  }

  // Volumen = peso x repeticiones totales; 0 si no hay peso registrado
  // (ejercicios de peso corporal no deberían dominar la gráfica de volumen).
  get volume(): number {
    return (this.props.weight ?? 0) * this.totalReps;
  }

  toJSON() {
    return {
      id: this.props.id,
      name: this.props.name,
      weight: this.props.weight,
      sets: this.props.sets,
      reps: this.props.reps,
    };
  }
}

export interface WorkoutProps {
  id: string;
  userId: string;
  workoutDate: string;
  durationSeconds: number;
  comments: string | null;
  exercises: WorkoutExercise[];
}

export class Workout {
  private constructor(private readonly props: WorkoutProps) {}

  static fromPersistence(props: WorkoutProps): Workout {
    return new Workout(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get workoutDate(): string {
    return this.props.workoutDate;
  }

  get durationSeconds(): number {
    return this.props.durationSeconds;
  }

  get comments(): string | null {
    return this.props.comments;
  }

  get exercises(): WorkoutExercise[] {
    return this.props.exercises;
  }

  get totalVolume(): number {
    return this.props.exercises.reduce((sum, ex) => sum + ex.volume, 0);
  }

  toJSON() {
    return {
      id: this.props.id,
      workoutDate: this.props.workoutDate,
      durationSeconds: this.props.durationSeconds,
      comments: this.props.comments,
      exercises: this.props.exercises.map((ex) => ex.toJSON()),
    };
  }
}
