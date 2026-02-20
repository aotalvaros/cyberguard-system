import { describe, it, expect } from '@jest/globals';
import {
  MalwareClassificationStrategy,
  IntrusionClassificationStrategy,
  PhishingClassificationStrategy,
  DdosClassificationStrategy,
  RansomwareClassificationStrategy,
} from '../../../../infrastructure/classification/ThreatClassificationStrategies';
import { ThreatContext } from '../../../../domain/ports/ThreatClassificationStrategy';

describe('ThreatClassificationStrategies', () => {
  const createContext = (overrides?: Partial<ThreatContext>): ThreatContext => ({
    type: 'malware',
    severity: 'high',
    sourceIp: '192.168.1.100',
    description: 'Test threat',
    ...overrides,
  });

  describe('MalwareClassificationStrategy', () => {
    const strategy = new MalwareClassificationStrategy();

    it('should have supportedType as malware', () => {
      expect(strategy.supportedType).toBe('malware');
    });

    it('should return base score for low severity', () => {
      const result = strategy.analyze(createContext({ severity: 'low' }));
      expect(result.riskScore).toBe(20);
      expect(result.tags).toContain('malware');
    });

    it('should return base score for medium severity', () => {
      const result = strategy.analyze(createContext({ severity: 'medium' }));
      expect(result.riskScore).toBe(40);
    });

    it('should return base score for high severity', () => {
      const result = strategy.analyze(createContext({ severity: 'high' }));
      expect(result.riskScore).toBe(70);
    });

    it('should return base score for critical severity', () => {
      const result = strategy.analyze(createContext({ severity: 'critical' }));
      expect(result.riskScore).toBe(90);
    });

    it('should add bonus for ransomware keyword in description', () => {
      const result = strategy.analyze(createContext({
        severity: 'high',
        description: 'Detected ransomware payload',
      }));
      expect(result.riskScore).toBe(80); // 70 + 10
      expect(result.tags).toContain('ransomware-variant');
    });

    it('should add bonus for trojan keyword', () => {
      const result = strategy.analyze(createContext({
        severity: 'medium',
        description: 'Trojan detected in system',
      }));
      expect(result.riskScore).toBe(50); // 40 + 10
      expect(result.tags).toContain('trojan');
    });

    it('should add cumulative bonus for multiple keywords', () => {
      const result = strategy.analyze(createContext({
        severity: 'medium',
        description: 'Trojan with keylogger capabilities detected',
      }));
      expect(result.riskScore).toBe(60); // 40 + 10 + 10
    });

    it('should cap riskScore at 100', () => {
      const result = strategy.analyze(createContext({
        severity: 'critical',
        description: 'ransomware trojan rootkit keylogger worm detected',
      }));
      expect(result.riskScore).toBe(100);
    });

    it('should recommend critical when riskScore >= 80', () => {
      const result = strategy.analyze(createContext({
        severity: 'high',
        description: 'ransomware detected',
      }));
      expect(result.recommendedSeverity).toBe('critical');
    });

    it('should keep original severity when riskScore < 80', () => {
      const result = strategy.analyze(createContext({
        severity: 'low',
        description: 'minor malware',
      }));
      expect(result.recommendedSeverity).toBe('low');
    });

    it('should auto-block when riskScore >= 90', () => {
      const result = strategy.analyze(createContext({ severity: 'critical' }));
      expect(result.autoBlock).toBe(true);
    });

    it('should not auto-block when riskScore < 90', () => {
      const result = strategy.analyze(createContext({ severity: 'low' }));
      expect(result.autoBlock).toBe(false);
    });

    it('should add encrypted-payload tag', () => {
      const result = strategy.analyze(createContext({
        description: 'encrypted payload detected',
      }));
      expect(result.tags).toContain('encrypted-payload');
    });

    it('should add critical-alert tag for critical severity', () => {
      const result = strategy.analyze(createContext({ severity: 'critical' }));
      expect(result.tags).toContain('critical-alert');
    });
  });

  describe('IntrusionClassificationStrategy', () => {
    const strategy = new IntrusionClassificationStrategy();

    it('should have supportedType as intrusion', () => {
      expect(strategy.supportedType).toBe('intrusion');
    });

    it('should return correct base scores', () => {
      expect(strategy.analyze(createContext({ type: 'intrusion', severity: 'low' })).riskScore).toBe(15);
      expect(strategy.analyze(createContext({ type: 'intrusion', severity: 'medium' })).riskScore).toBe(35);
      expect(strategy.analyze(createContext({ type: 'intrusion', severity: 'high' })).riskScore).toBe(65);
      expect(strategy.analyze(createContext({ type: 'intrusion', severity: 'critical' })).riskScore).toBe(85);
    });

    it('should add bonus for high attempt count', () => {
      const result = strategy.analyze(createContext({
        type: 'intrusion',
        severity: 'medium',
        metadata: { attempts: 15 },
      }));
      expect(result.riskScore).toBe(55); // 35 + 20
    });

    it('should add extra bonus for very high attempt count', () => {
      const result = strategy.analyze(createContext({
        type: 'intrusion',
        severity: 'medium',
        metadata: { attempts: 60 },
      }));
      expect(result.riskScore).toBe(70); // 35 + 20 + 15
    });

    it('should auto-block when autoDetected is true', () => {
      const result = strategy.analyze(createContext({
        type: 'intrusion',
        severity: 'low',
        metadata: { autoDetected: true },
      }));
      expect(result.autoBlock).toBe(true);
      expect(result.tags).toContain('brute-force');
    });

    it('should auto-block when riskScore >= 85', () => {
      const result = strategy.analyze(createContext({
        type: 'intrusion',
        severity: 'critical',
      }));
      expect(result.autoBlock).toBe(true);
    });

    it('should recommend critical when riskScore >= 75', () => {
      const result = strategy.analyze(createContext({
        type: 'intrusion',
        severity: 'critical',
      }));
      expect(result.recommendedSeverity).toBe('critical');
    });

    it('should add high-priority tag for high/critical severity', () => {
      const result = strategy.analyze(createContext({
        type: 'intrusion',
        severity: 'high',
      }));
      expect(result.tags).toContain('high-priority');
    });

    it('should add autoDetected bonus to metadata analysis', () => {
      const result = strategy.analyze(createContext({
        type: 'intrusion',
        severity: 'medium',
        metadata: { autoDetected: true, attempts: 5 },
      }));
      expect(result.riskScore).toBe(45); // 35 + 10
    });

    it('should handle no metadata gracefully', () => {
      const result = strategy.analyze(createContext({
        type: 'intrusion',
        severity: 'low',
      }));
      expect(result.riskScore).toBe(15);
    });

    it('should cap at 100', () => {
      const result = strategy.analyze(createContext({
        type: 'intrusion',
        severity: 'critical',
        metadata: { attempts: 100, autoDetected: true },
      }));
      expect(result.riskScore).toBe(100);
    });
  });

  describe('PhishingClassificationStrategy', () => {
    const strategy = new PhishingClassificationStrategy();

    it('should have supportedType as phishing', () => {
      expect(strategy.supportedType).toBe('phishing');
    });

    it('should return correct scores by severity', () => {
      expect(strategy.analyze(createContext({ type: 'phishing', severity: 'low' })).riskScore).toBe(25);
      expect(strategy.analyze(createContext({ type: 'phishing', severity: 'medium' })).riskScore).toBe(50);
      expect(strategy.analyze(createContext({ type: 'phishing', severity: 'high' })).riskScore).toBe(75);
      expect(strategy.analyze(createContext({ type: 'phishing', severity: 'critical' })).riskScore).toBe(95);
    });

    it('should auto-block when riskScore >= 80', () => {
      const result = strategy.analyze(createContext({ type: 'phishing', severity: 'critical' }));
      expect(result.autoBlock).toBe(true);
    });

    it('should not auto-block for low severity', () => {
      const result = strategy.analyze(createContext({ type: 'phishing', severity: 'low' }));
      expect(result.autoBlock).toBe(false);
    });

    it('should add email-phishing tag', () => {
      const result = strategy.analyze(createContext({
        type: 'phishing',
        description: 'Suspicious email received',
      }));
      expect(result.tags).toContain('email-phishing');
    });

    it('should add credential-theft tag', () => {
      const result = strategy.analyze(createContext({
        type: 'phishing',
        description: 'Credential harvesting attempt',
      }));
      expect(result.tags).toContain('credential-theft');
    });

    it('should add spear-phishing tag', () => {
      const result = strategy.analyze(createContext({
        type: 'phishing',
        description: 'Spear phishing targeting CEO',
      }));
      expect(result.tags).toContain('spear-phishing');
    });
  });

  describe('DdosClassificationStrategy', () => {
    const strategy = new DdosClassificationStrategy();

    it('should have supportedType as ddos', () => {
      expect(strategy.supportedType).toBe('ddos');
    });

    it('should return correct scores by severity', () => {
      expect(strategy.analyze(createContext({ type: 'ddos', severity: 'low' })).riskScore).toBe(30);
      expect(strategy.analyze(createContext({ type: 'ddos', severity: 'medium' })).riskScore).toBe(55);
      expect(strategy.analyze(createContext({ type: 'ddos', severity: 'high' })).riskScore).toBe(80);
      expect(strategy.analyze(createContext({ type: 'ddos', severity: 'critical' })).riskScore).toBe(100);
    });

    it('should always auto-block', () => {
      expect(strategy.analyze(createContext({ type: 'ddos', severity: 'low' })).autoBlock).toBe(true);
      expect(strategy.analyze(createContext({ type: 'ddos', severity: 'critical' })).autoBlock).toBe(true);
    });

    it('should recommend critical when riskScore >= 70', () => {
      const result = strategy.analyze(createContext({ type: 'ddos', severity: 'high' }));
      expect(result.recommendedSeverity).toBe('critical');
    });

    it('should keep original severity when riskScore < 70', () => {
      const result = strategy.analyze(createContext({ type: 'ddos', severity: 'low' }));
      expect(result.recommendedSeverity).toBe('low');
    });

    it('should include network-attack tag', () => {
      const result = strategy.analyze(createContext({ type: 'ddos' }));
      expect(result.tags).toContain('network-attack');
      expect(result.tags).toContain('ddos');
    });
  });

  describe('RansomwareClassificationStrategy', () => {
    const strategy = new RansomwareClassificationStrategy();

    it('should have supportedType as ransomware', () => {
      expect(strategy.supportedType).toBe('ransomware');
    });

    it('should add inherent risk bonus of 10', () => {
      const result = strategy.analyze(createContext({ type: 'ransomware', severity: 'low' }));
      expect(result.riskScore).toBe(60); // 50 + 10
    });

    it('should cap riskScore at 100', () => {
      const result = strategy.analyze(createContext({ type: 'ransomware', severity: 'critical' }));
      expect(result.riskScore).toBe(100); // min(100, 100 + 10)
    });

    it('should always recommend critical severity', () => {
      expect(strategy.analyze(createContext({ type: 'ransomware', severity: 'low' })).recommendedSeverity).toBe('critical');
      expect(strategy.analyze(createContext({ type: 'ransomware', severity: 'medium' })).recommendedSeverity).toBe('critical');
    });

    it('should always auto-block', () => {
      expect(strategy.analyze(createContext({ type: 'ransomware', severity: 'low' })).autoBlock).toBe(true);
    });

    it('should add encryption-detected tag', () => {
      const result = strategy.analyze(createContext({
        type: 'ransomware',
        description: 'Files being encrypted by unknown process',
      }));
      expect(result.tags).toContain('encryption-detected');
    });

    it('should add ransom-demand tag for bitcoin mention', () => {
      const result = strategy.analyze(createContext({
        type: 'ransomware',
        description: 'Demands bitcoin payment for decryption',
      }));
      expect(result.tags).toContain('ransom-demand');
    });

    it('should add ransom-demand tag for ransom mention', () => {
      const result = strategy.analyze(createContext({
        type: 'ransomware',
        description: 'Ransom note left on desktop',
      }));
      expect(result.tags).toContain('ransom-demand');
    });

    it('should always include critical-alert and auto-blocked tags', () => {
      const result = strategy.analyze(createContext({ type: 'ransomware' }));
      expect(result.tags).toContain('critical-alert');
      expect(result.tags).toContain('auto-blocked');
      expect(result.tags).toContain('ransomware');
    });
  });
});
