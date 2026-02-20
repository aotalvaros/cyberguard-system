/**
 * Modelo de dominio para el resultado de eliminar una amenaza.
 */
export interface DeleteThreatResult {
  readonly success: boolean;
  readonly threatId: string;
  readonly message: string;
}
