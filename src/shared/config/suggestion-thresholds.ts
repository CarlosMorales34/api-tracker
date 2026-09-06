// Único lugar de umbrales/constantes del motor de sugerencias -- nada de
// estos valores debe repetirse a mano en otro archivo. Ajustar el
// comportamiento del detector es cambiar un número acá, no buscar por el
// código. Valores iniciales tal como los pidió el usuario.
export const SUGGESTION_THRESHOLDS = {
  // Mínimo de registros (bloques de tiempo source='manual') para siquiera
  // considerar un patrón -- por debajo de esto ni se calcula confianza.
  MIN_SAMPLE_COUNT: 4,
  // Mínimo de semanas distintas en las que aparece el patrón -- evita que 4
  // registros en la misma semana (ej. un día ocupado) parezcan un hábito.
  MIN_DISTINCT_WEEKS: 3,
  // Debajo de esto, la sugerencia se calcula pero no se muestra al usuario.
  MIN_CONFIDENCE_TO_SHOW: 0.7,
  // Para crear rutinas nuevas desde actividades se exige una coincidencia
  // más fuerte que para ajustar rutinas fijas existentes. Una actividad
  // ocasional con muchas horas (ej. entretenimiento algunos días) no debe
  // aparecer como rutina recomendada si no es claramente repetible.
  MIN_ACTIVITY_MATCH_RATIO_TO_CREATE_ROUTINE: 0.7,
  // Las rutinas fijas ya son una intención explícita del usuario; con buen
  // volumen de historial basta una coincidencia moderada para sugerir días/
  // horario y dejar que el usuario confirme.
  MIN_ROUTINE_MATCH_RATIO_TO_UPDATE: 0.6,
  // Ventana de historial que analiza el detector, en semanas hacia atrás.
  PATTERN_LOOKBACK_WEEKS: 8,

  // --- Fórmula de confianza (ver activity-pattern-calculations.ts) ---
  // sampleFactor satura en 1.0 cuando sampleCount alcanza el doble del mínimo.
  SAMPLE_FACTOR_SATURATION_MULTIPLIER: 2,
  // weekFactor satura en 1.0 cuando distinctWeeks alcanza el doble del mínimo.
  WEEK_FACTOR_SATURATION_MULTIPLIER: 2,
  // Dispersión (en minutos) de horario a partir de la cual la consistencia
  // cae a 0 -- ej. si el horario de inicio varía en promedio 90+ minutos,
  // ya no hay patrón de horario real que sugerir.
  MAX_DISPERSION_MINUTES_FOR_ZERO_CONFIDENCE: 90,
  // Días desde el último registro a partir de los cuales la recencia cae a 0
  // -- un patrón de hace 2 meses sin repetirse ya no es confiable hoy.
  RECENCY_DECAY_DAYS: 30,
  // Cada descarte reciente de una sugerencia similar penaliza la confianza
  // en este porcentaje (acumulativo, tope en 0).
  DISMISSAL_PENALTY_PER_EVENT: 0.15,
  // Cada aceptación reciente de una sugerencia similar da este boost
  // multiplicativo (acumulativo).
  ACCEPTANCE_BOOST_PER_EVENT: 0.05,

  // --- Aprendizaje por corrección (ver "peso de correcciones recientes") ---
  // Cuántas correcciones recientes (accepted_with_changes) del usuario para
  // el mismo patrón se promedian al recalcular el horario sugerido -- más
  // peso a las últimas N que al historial completo, para que la sugerencia
  // se acerque gradualmente a lo que el usuario realmente usa.
  RECENT_CORRECTIONS_WINDOW: 5,
} as const;
