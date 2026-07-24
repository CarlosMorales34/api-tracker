// activity_logs es de solo lectura desde la API por ahora (contrato: "no hay
// endpoint de escritura, es intencional") — sin creación vía use case no hay
// invariantes que encapsular, así que se modela como interfaz plana.
export interface ActivityLog {
  id: string;
  activityId: string;
  logDate: string;
  hours: number;
  note: string | null;
}

// Vista enriquecida (join activities -> activity_categories) que usan los
// agregados de Registro Semanal: necesitan nombre/categoría, no solo el id.
export interface ActivityLogDetail {
  activityId: string;
  activityName: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  logDate: string;
  hours: number;
}
