import { ThreatType, SeverityLevel } from '../entities/Threat';

/**
 * Resultado del análisis de una amenaza por una estrategia de detección.
 */
export interface ThreatAnalysisResult {
  readonly riskScore: number;         // 0-100
  readonly recommendedSeverity: SeverityLevel;
  readonly tags: readonly string[];
  readonly autoBlock: boolean;
}

/**
 * Strategy Pattern: Define el contrato para estrategias de clasificación de amenazas.
 * 
 * Cada implementación encapsula la lógica de análisis específica para un tipo de amenaza,
 * permitiendo agregar nuevos tipos sin modificar el código existente (Open/Closed Principle).
 */
export interface ThreatClassificationStrategy {
  /**
   * Tipo de amenaza que esta estrategia puede analizar.
   */
  readonly supportedType: ThreatType;

  /**
   * Analiza una amenaza y retorna un resultado de clasificación.
   */
  analyze(context: ThreatContext): ThreatAnalysisResult;
}

/**
 * Contexto de amenaza proporcionado a las estrategias para análisis.
 */
export interface ThreatContext {
  readonly type: ThreatType;
  readonly severity: SeverityLevel;
  readonly sourceIp: string;
  readonly targetIp?: string;
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
}
