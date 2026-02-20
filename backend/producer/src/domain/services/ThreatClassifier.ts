import {
  ThreatClassificationStrategy,
  ThreatContext,
  ThreatAnalysisResult,
} from '../../domain/ports/ThreatClassificationStrategy';
import { ThreatType } from '../../domain/entities/Threat';

/**
 * Servicio de dominio que orquesta las estrategias de clasificación de amenazas.
 * 
 * Utiliza el patrón Strategy para delegar la lógica de análisis al strategy
 * correspondiente según el tipo de amenaza, permitiendo extensibilidad sin
 * modificar código existente (Open/Closed Principle).
 */
export class ThreatClassifier {
  private readonly strategies: ReadonlyMap<ThreatType, ThreatClassificationStrategy>;

  constructor(strategies: readonly ThreatClassificationStrategy[]) {
    const strategyMap = new Map<ThreatType, ThreatClassificationStrategy>();
    for (const strategy of strategies) {
      strategyMap.set(strategy.supportedType, strategy);
    }
    this.strategies = strategyMap;
  }

  /**
   * Clasifica una amenaza usando la estrategia registrada para su tipo.
   * Si no hay estrategia registrada, retorna un análisis por defecto.
   */
  classify(context: ThreatContext): ThreatAnalysisResult {
    const strategy = this.strategies.get(context.type);

    if (!strategy) {
      return this.defaultAnalysis(context);
    }

    return strategy.analyze(context);
  }

  /**
   * Verifica si hay una estrategia registrada para el tipo de amenaza.
   */
  hasStrategy(type: ThreatType): boolean {
    return this.strategies.has(type);
  }

  /**
   * Retorna los tipos de amenaza soportados.
   */
  getSupportedTypes(): readonly ThreatType[] {
    return [...this.strategies.keys()];
  }

  private defaultAnalysis(context: ThreatContext): ThreatAnalysisResult {
    const severityScores: Record<string, number> = {
      low: 20,
      medium: 40,
      high: 60,
      critical: 80,
    };

    return {
      riskScore: severityScores[context.severity] ?? 50,
      recommendedSeverity: context.severity,
      tags: [context.type, 'unclassified'],
      autoBlock: context.severity === 'critical',
    };
  }
}
