import { Injectable } from '@angular/core';
import { ThreatType } from '../../core/domain/models/threat-type.enum';
import {
  ThreatValidationStrategy,
  MalwareValidationStrategy,
  IntrusionValidationStrategy,
  PhishingValidationStrategy,
  DdosValidationStrategy,
  RansomwareValidationStrategy,
  DefaultValidationStrategy
} from '../strategies/threat-validation.strategy';

@Injectable({
  providedIn: 'root'
})
export class ThreatValidationFactory {
  createValidator(type: ThreatType): ThreatValidationStrategy {
    switch (type) {
      case ThreatType.MALWARE:
        return new MalwareValidationStrategy();
      case ThreatType.INTRUSION:
        return new IntrusionValidationStrategy();
      case ThreatType.PHISHING:
        return new PhishingValidationStrategy();
      case ThreatType.DDOS:
        return new DdosValidationStrategy();
      case ThreatType.RANSOMWARE:
        return new RansomwareValidationStrategy();
      default:
        return new DefaultValidationStrategy();
    }
  }
}
