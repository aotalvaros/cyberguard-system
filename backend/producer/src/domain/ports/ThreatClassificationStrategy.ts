import { ThreatType, SeverityLevel } from '../entities/Threat';

export interface ThreatAnalysisResult {
  readonly riskScore: number;
  readonly recommendedSeverity: SeverityLevel;
  readonly tags: readonly string[];
  readonly autoBlock: boolean;
}

export interface ThreatClassificationStrategy {

  readonly supportedType: ThreatType;

  analyze(context: ThreatContext): ThreatAnalysisResult;
}

export interface ThreatContext {
  readonly type: ThreatType;
  readonly severity: SeverityLevel;
  readonly sourceIp: string;
  readonly targetIp?: string;
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
}
