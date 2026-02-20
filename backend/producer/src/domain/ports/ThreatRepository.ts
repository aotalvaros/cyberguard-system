
export interface Threat {
  threatId: string;
  type: string;
  severity: string;
  sourceIp: string;
  targetIp?: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface ThreatRepository {
  /**
   * Guardar una nueva amenaza
   * @param threat Entidad de amenaza
   * @returns ID de la amenaza guardada
   */
  save(threat: Threat): Promise<string>;

  /**
   * Obtener todas las amenazas (ordenadas por más reciente primero)
   * @returns Array de amenazas
   */
  findAll(): Promise<Threat[]>;

  /**
   * Obtener una amenaza por ID
   * @param threatId ID de la amenaza
   * @returns Amenaza o null si no existe
   */
  findById(threatId: string): Promise<Threat | null>;

  /**
   * Eliminar una amenaza por ID
   * @param threatId ID de la amenaza
   * @returns true si fue eliminada, false si no existía
   */
  delete(threatId: string): Promise<boolean>;
}
