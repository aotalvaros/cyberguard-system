import {
  ThreatClassificationStrategy,
  ThreatContext,
  ThreatAnalysisResult,
} from '../../domain/ports/ThreatClassificationStrategy';
import { ThreatType, SeverityLevel } from '../../domain/entities/Threat';

export class MalwareClassificationStrategy implements ThreatClassificationStrategy {
  readonly supportedType: ThreatType = 'malware';

  analyze(context: ThreatContext): ThreatAnalysisResult {
    const baseSeverityScore = this.getSeverityScore(context.severity);
    const descriptionBonus = this.analyzeDescription(context.description);
    const riskScore = Math.min(100, baseSeverityScore + descriptionBonus);

    return {
      riskScore,
      recommendedSeverity: riskScore >= 80 ? 'critical' : context.severity,
      tags: this.generateTags(context),
      autoBlock: riskScore >= 90,
    };
  }

  private getSeverityScore(severity: SeverityLevel): number {
    const scores: Record<SeverityLevel, number> = {
      low: 20,
      medium: 40,
      high: 70,
      critical: 90,
    };
    return scores[severity];
  }

  private analyzeDescription(description: string): number {
    const highRiskKeywords = ['ransomware', 'trojan', 'rootkit', 'keylogger', 'worm'];
    const lowerDesc = description.toLowerCase();
    const matchCount = highRiskKeywords.filter((kw) => lowerDesc.includes(kw)).length;
    return matchCount * 10;
  }

  private generateTags(context: ThreatContext): string[] {
    const tags: string[] = ['malware'];
    const lowerDesc = context.description.toLowerCase();

    if (lowerDesc.includes('ransomware')) tags.push('ransomware-variant');
    if (lowerDesc.includes('trojan')) tags.push('trojan');
    if (lowerDesc.includes('encrypted')) tags.push('encrypted-payload');
    if (context.severity === 'critical') tags.push('critical-alert');

    return tags;
  }
}

export class IntrusionClassificationStrategy implements ThreatClassificationStrategy {
  readonly supportedType: ThreatType = 'intrusion';

  analyze(context: ThreatContext): ThreatAnalysisResult {
    const baseSeverityScore = this.getSeverityScore(context.severity);
    const metadataBonus = this.analyzeMetadata(context.metadata);
    const riskScore = Math.min(100, baseSeverityScore + metadataBonus);

    return {
      riskScore,
      recommendedSeverity: riskScore >= 75 ? 'critical' : context.severity,
      tags: this.generateTags(context),
      autoBlock: context.metadata?.['autoDetected'] === true || riskScore >= 85,
    };
  }

  private getSeverityScore(severity: SeverityLevel): number {
    const scores: Record<SeverityLevel, number> = {
      low: 15,
      medium: 35,
      high: 65,
      critical: 85,
    };
    return scores[severity];
  }

  private analyzeMetadata(metadata?: Record<string, unknown>): number {
    if (!metadata) return 0;
    let bonus = 0;

    const attempts = metadata['attempts'];
    if (typeof attempts === 'number' && attempts > 10) bonus += 20;
    if (typeof attempts === 'number' && attempts > 50) bonus += 15;

    if (metadata['autoDetected'] === true) bonus += 10;

    return bonus;
  }

  private generateTags(context: ThreatContext): string[] {
    const tags: string[] = ['intrusion'];
    if (context.metadata?.['autoDetected'] === true) tags.push('brute-force');
    if (context.severity === 'critical' || context.severity === 'high') tags.push('high-priority');
    return tags;
  }
}

export class PhishingClassificationStrategy implements ThreatClassificationStrategy {
  readonly supportedType: ThreatType = 'phishing';

  analyze(context: ThreatContext): ThreatAnalysisResult {
    const baseSeverityScore = this.getSeverityScore(context.severity);
    const riskScore = Math.min(100, baseSeverityScore);

    return {
      riskScore,
      recommendedSeverity: context.severity,
      tags: this.generateTags(context),
      autoBlock: riskScore >= 80,
    };
  }

  private getSeverityScore(severity: SeverityLevel): number {
    const scores: Record<SeverityLevel, number> = {
      low: 25,
      medium: 50,
      high: 75,
      critical: 95,
    };
    return scores[severity];
  }

  private generateTags(context: ThreatContext): string[] {
    const tags: string[] = ['phishing'];
    const lowerDesc = context.description.toLowerCase();
    if (lowerDesc.includes('email')) tags.push('email-phishing');
    if (lowerDesc.includes('credential')) tags.push('credential-theft');
    if (lowerDesc.includes('spear')) tags.push('spear-phishing');
    return tags;
  }
}

export class DdosClassificationStrategy implements ThreatClassificationStrategy {
  readonly supportedType: ThreatType = 'ddos';

  analyze(context: ThreatContext): ThreatAnalysisResult {
    const baseSeverityScore = this.getSeverityScore(context.severity);
    const riskScore = Math.min(100, baseSeverityScore);

    return {
      riskScore,
      recommendedSeverity: riskScore >= 70 ? 'critical' : context.severity,
      tags: ['ddos', 'network-attack'],
      autoBlock: true, // DDoS siempre auto-block
    };
  }

  private getSeverityScore(severity: SeverityLevel): number {
    const scores: Record<SeverityLevel, number> = {
      low: 30,
      medium: 55,
      high: 80,
      critical: 100,
    };
    return scores[severity];
  }
}

export class RansomwareClassificationStrategy implements ThreatClassificationStrategy {
  readonly supportedType: ThreatType = 'ransomware';

  analyze(context: ThreatContext): ThreatAnalysisResult {
    const baseSeverityScore = this.getSeverityScore(context.severity);
    const riskScore = Math.min(100, baseSeverityScore + 10); // +10 inherent risk

    return {
      riskScore,
      recommendedSeverity: 'critical', // Ransomware siempre escalado a critical
      tags: this.generateTags(context),
      autoBlock: true, // Ransomware siempre auto-block
    };
  }

  private getSeverityScore(severity: SeverityLevel): number {
    const scores: Record<SeverityLevel, number> = {
      low: 50,
      medium: 70,
      high: 85,
      critical: 100,
    };
    return scores[severity];
  }

  private generateTags(context: ThreatContext): string[] {
    const tags: string[] = ['ransomware', 'critical-alert', 'auto-blocked'];
    const lowerDesc = context.description.toLowerCase();
    if (lowerDesc.includes('encrypt')) tags.push('encryption-detected');
    if (lowerDesc.includes('bitcoin') || lowerDesc.includes('ransom')) tags.push('ransom-demand');
    return tags;
  }
}
