export interface WorkoutExerciseProps {
  id: string;
  workoutId: string;
  name: string;
  // Para ejercicios de peso corporal (dominadas, lagartijas), este campo
  // deja de significar "cuánto pesas" y pasa a ser peso ADICIONAL (ej.
  // dominadas lastradas) -- null/0 = sin peso extra. Ver isBodyweight.
  weight: number | null;
  // "De peso corporal" -- el usuario no tiene que inventar un número de
  // libras para dominadas/lagartijas; `weight` queda libre para el peso
  // extra opcional en variantes lastradas.
  isBodyweight: boolean;
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

  get isBodyweight(): boolean {
    return this.props.isBodyweight;
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
      isBodyweight: this.props.isBodyweight,
      sets: this.props.sets,
      reps: this.props.reps,
    };
  }
}

export interface WorkoutProps {
  id: string;
  userId: string;
  workoutDate: string;
  // Rutina de la que se originó este entrenamiento (si el usuario usó "Usar
  // rutina" al registrarlo), null si fue libre. Se fija solo al crear, no
  // se toca en update.
  sourceRoutineId: string | null;
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

  get sourceRoutineId(): string | null {
    return this.props.sourceRoutineId;
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
      sourceRoutineId: this.props.sourceRoutineId,
      durationSeconds: this.props.durationSeconds,
      comments: this.props.comments,
      exercises: this.props.exercises.map((ex) => ex.toJSON()),
    };
  }
}
