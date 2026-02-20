import { describe, it, expect } from '@jest/globals';
import { ThreatClassifier } from '../../../../domain/services/ThreatClassifier';
import {
  ThreatClassificationStrategy,
  ThreatContext,
  ThreatAnalysisResult,
} from '../../../../domain/ports/ThreatClassificationStrategy';
import { ThreatType } from '../../../../domain/entities/Threat';

describe('ThreatClassifier', () => {
  const createContext = (overrides?: Partial<ThreatContext>): ThreatContext => ({
    type: 'malware',
    severity: 'high',
    sourceIp: '192.168.1.100',
    description: 'Test threat',
    ...overrides,
  });

  const createMockStrategy = (
    type: ThreatType,
    result: Partial<ThreatAnalysisResult> = {}
  ): ThreatClassificationStrategy => ({
    supportedType: type,
    analyze: (): ThreatAnalysisResult => ({
      riskScore: 50,
      recommendedSeverity: 'medium',
      tags: [type],
      autoBlock: false,
      ...result,
    }),
  });

  describe('classify', () => {
    it('should delegate to the correct strategy based on threat type', () => {
      const malwareStrategy = createMockStrategy('malware', { riskScore: 85, tags: ['malware'] });
      const intrusionStrategy = createMockStrategy('intrusion', { riskScore: 60, tags: ['intrusion'] });
      const classifier = new ThreatClassifier([malwareStrategy, intrusionStrategy]);

      const result = classifier.classify(createContext({ type: 'malware' }));

      expect(result.riskScore).toBe(85);
      expect(result.tags).toContain('malware');
    });

    it('should use intrusion strategy for intrusion threats', () => {
      const intrusionStrategy = createMockStrategy('intrusion', { riskScore: 75, autoBlock: true });
      const classifier = new ThreatClassifier([intrusionStrategy]);

      const result = classifier.classify(createContext({ type: 'intrusion', severity: 'critical' }));

      expect(result.riskScore).toBe(75);
      expect(result.autoBlock).toBe(true);
    });

    it('should return default analysis when no strategy matches', () => {
      const malwareStrategy = createMockStrategy('malware');
      const classifier = new ThreatClassifier([malwareStrategy]);

      const result = classifier.classify(createContext({ type: 'phishing', severity: 'high' }));

      expect(result.riskScore).toBe(60);
      expect(result.tags).toContain('unclassified');
      expect(result.tags).toContain('phishing');
    });

    it('should auto-block critical unclassified threats', () => {
      const classifier = new ThreatClassifier([]);

      const result = classifier.classify(createContext({ type: 'ddos', severity: 'critical' }));

      expect(result.autoBlock).toBe(true);
      expect(result.recommendedSeverity).toBe('critical');
    });

    it('should not auto-block non-critical unclassified threats', () => {
      const classifier = new ThreatClassifier([]);

      const result = classifier.classify(createContext({ type: 'ddos', severity: 'low' }));

      expect(result.autoBlock).toBe(false);
    });

    it('should handle low severity in default analysis', () => {
      const classifier = new ThreatClassifier([]);

      const result = classifier.classify(createContext({ type: 'malware', severity: 'low' }));

      expect(result.riskScore).toBe(20);
    });

    it('should handle medium severity in default analysis', () => {
      const classifier = new ThreatClassifier([]);

      const result = classifier.classify(createContext({ type: 'malware', severity: 'medium' }));

      expect(result.riskScore).toBe(40);
    });

    it('should handle critical severity in default analysis', () => {
      const classifier = new ThreatClassifier([]);

      const result = classifier.classify(createContext({ type: 'malware', severity: 'critical' }));

      expect(result.riskScore).toBe(80);
    });
  });

  describe('hasStrategy', () => {
    it('should return true for registered strategies', () => {
      const classifier = new ThreatClassifier([createMockStrategy('malware')]);

      expect(classifier.hasStrategy('malware')).toBe(true);
    });

    it('should return false for unregistered strategies', () => {
      const classifier = new ThreatClassifier([createMockStrategy('malware')]);

      expect(classifier.hasStrategy('intrusion')).toBe(false);
    });
  });

  describe('getSupportedTypes', () => {
    it('should return all registered threat types', () => {
      const classifier = new ThreatClassifier([
        createMockStrategy('malware'),
        createMockStrategy('intrusion'),
        createMockStrategy('phishing'),
      ]);

      const types = classifier.getSupportedTypes();

      expect(types).toHaveLength(3);
      expect(types).toContain('malware');
      expect(types).toContain('intrusion');
      expect(types).toContain('phishing');
    });

    it('should return empty array when no strategies registered', () => {
      const classifier = new ThreatClassifier([]);

      expect(classifier.getSupportedTypes()).toHaveLength(0);
    });
  });

  describe('strategy override', () => {
    it('should use last registered strategy when duplicates exist', () => {
      const strategy1 = createMockStrategy('malware', { riskScore: 30 });
      const strategy2 = createMockStrategy('malware', { riskScore: 90 });
      const classifier = new ThreatClassifier([strategy1, strategy2]);

      const result = classifier.classify(createContext({ type: 'malware' }));

      expect(result.riskScore).toBe(90);
    });
  });
});
