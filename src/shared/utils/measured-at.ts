// El campo measuredAt de una medición corporal se trata como literal local,
// nunca como instante UTC -- evita el bug de fechas que se corrían de mes
// cuando se registraba una medición tarde en la noche: convertir a UTC
// (toISOString) y de regreso dependía de que el timezone del servidor
// coincidiera con el del usuario, algo que no está garantizado en hosting.
// Mismo criterio que shared/lib/week.ts en el frontend (sin toISOString).
export function normalizeMeasuredAt(input: string): string {
  const hasZone = /Z$|[+-]\d{2}:\d{2}$/.test(input);
  if (hasZone) {
    // Ya viene como instante UTC explícito (compatibilidad con llamadores
    // que todavía mandan ISO con Z) -- se formatean sus componentes UTC tal
    // cual, sin reinterpretarlos con la zona del proceso.
    const date = new Date(input);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  }
  // Literal local naive "YYYY-MM-DDTHH:mm[:ss]" -- se pasa tal cual.
  return /T\d{2}:\d{2}$/.test(input) ? `${input}:00` : input;
}
