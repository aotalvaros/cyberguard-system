import { ThreatRequest } from '../../core/domain/models/threat-request.model';
import { ThreatSeverity } from '../../core/domain/models/threat-severity.enum';

export interface ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
export class MalwareValidationStrategy implements ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult {
    const errors: string[] = [];

    if (!threat.description.toLowerCase().includes('malware') &&
        !threat.description.toLowerCase().includes('virus')) {
      errors.push('La descripción debe mencionar "malware" o "virus" para este tipo de amenaza');
    }

    if (threat.severity === ThreatSeverity.LOW) {
      errors.push('Malware no puede ser severidad LOW: implica un riesgo activo (mínimo MEDIUM)');
    }

    return { valid: errors.length === 0, errors };
  }
}

export class IntrusionValidationStrategy implements ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult {
    const errors: string[] = [];

    if (!threat.description.toLowerCase().includes('intrusion') &&
        !threat.description.toLowerCase().includes('intruso') &&
        !threat.description.toLowerCase().includes('breach')) {
      errors.push('La descripción debe mencionar "intrusion", "intruso" o "breach" para este tipo de amenaza');
    }

    if (threat.severity === ThreatSeverity.LOW) {
      errors.push('Intrusión no puede ser severidad LOW: implica acceso no autorizado (mínimo MEDIUM)');
    }

    return { valid: errors.length === 0, errors };
  }
}

export class PhishingValidationStrategy implements ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult {
    const errors: string[] = [];

    if (!threat.description.toLowerCase().includes('phishing') &&
        !threat.description.toLowerCase().includes('email')) {
      errors.push('La descripción debe mencionar "phishing" o "email" para este tipo de amenaza');
    }

    return { valid: errors.length === 0, errors };
  }
}

export class DdosValidationStrategy implements ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult {
    const errors: string[] = [];

    if (threat.severity !== ThreatSeverity.CRITICAL && threat.severity !== ThreatSeverity.HIGH) {
      errors.push('DDoS debe ser severidad HIGH o CRITICAL: impacta directamente la disponibilidad del servicio');
    }

    return { valid: errors.length === 0, errors };
  }
}

export class RansomwareValidationStrategy implements ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult {
    const errors: string[] = [];

    if (threat.severity !== ThreatSeverity.CRITICAL) {
      errors.push('Ransomware siempre debe ser CRITICAL: compromete disponibilidad e integridad de los datos');
    }

    return { valid: errors.length === 0, errors };
  }
}
export class DefaultValidationStrategy implements ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult {
    const errors: string[] = [];

    if (threat.description.length < 10) {
      errors.push('La descripción debe tener al menos 10 caracteres');
    }

    if (!threat.sourceIp.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
      errors.push('Formato de IP origen inválido');
    }

    return { valid: errors.length === 0, errors };
  }
}
