import { ThreatRequest } from '../../core/domain/models/threat-request.model';

// ⚠️ HUMAN CHECK:
// Strategy Pattern para validación específica por tipo de amenaza
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
      errors.push('Malware threats should mention malware or virus');
    }
    
    if (threat.severity === 'low') {
      errors.push('Malware threats should be at least medium severity');
    }
    
    return { valid: errors.length === 0, errors };
  }
}

export class PhishingValidationStrategy implements ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult {
    const errors: string[] = [];
    
    if (!threat.description.toLowerCase().includes('phishing') && 
        !threat.description.toLowerCase().includes('email')) {
      errors.push('Phishing threats should mention phishing or email');
    }
    
    return { valid: errors.length === 0, errors };
  }
}

export class DdosValidationStrategy implements ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult {
    const errors: string[] = [];
    
    if (threat.severity !== 'critical' && threat.severity !== 'high') {
      errors.push('DDoS attacks should be high or critical severity');
    }
    
    return { valid: errors.length === 0, errors };
  }
}

export class RansomwareValidationStrategy implements ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult {
    const errors: string[] = [];
    
    if (threat.severity !== 'critical') {
      errors.push('Ransomware should always be critical severity');
    }
    
    return { valid: errors.length === 0, errors };
  }
}

export class DefaultValidationStrategy implements ThreatValidationStrategy {
  validate(threat: ThreatRequest): ValidationResult {
    const errors: string[] = [];
    
    if (threat.description.length < 10) {
      errors.push('Description must be at least 10 characters');
    }
    
    if (!threat.sourceIp.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
      errors.push('Invalid source IP format');
    }
    
    return { valid: errors.length === 0, errors };
  }
}
