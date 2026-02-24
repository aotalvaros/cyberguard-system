import { describe, it, expect, beforeEach } from '@jest/globals';
import { Threat, ThreatProps } from '../../../../domain/entities/Threat';

/**
 * Tests para la entidad de dominio Threat.
 *
 * VERIFICAR: contrato estructural (que la entidad se construye y expone
 *   los datos correctamente).
 * VALIDAR:   reglas de negocio (isHighSeverity, isCritical — protegen
 *   lógica que el dominio garantiza como invariante).
 *
 * Sin mocks: las entidades de dominio son POJO — no tienen dependencias externas.
 */
describe('Threat Entity', () => {
  const baseProps: ThreatProps = {
    type: 'malware',
    severity: 'high',
    sourceIp: '192.168.1.100',
    description: 'Malware detected on endpoint',
  };

  // =========================================================================
  // create()
  // =========================================================================
  describe('create()', () => {
    it('should create a threat with all provided fields', () => {
      // Arrange
      const props: ThreatProps = {
        ...baseProps,
        threatId: 'threat-id-abc',
        targetIp: '10.0.0.1',
        metadata: { source: 'antivirus' },
        timestamp: '2026-02-23T00:00:00.000Z',
      };

      // Act
      const threat = Threat.create(props);

      // Assert — VERIFICAR: los campos se almacenan sin transformación
      expect(threat.threatId).toBe('threat-id-abc');
      expect(threat.type).toBe('malware');
      expect(threat.severity).toBe('high');
      expect(threat.sourceIp).toBe('192.168.1.100');
      expect(threat.description).toBe('Malware detected on endpoint');
      expect(threat.targetIp).toBe('10.0.0.1');
      expect(threat.metadata).toEqual({ source: 'antivirus' });
      expect(threat.timestamp).toBe('2026-02-23T00:00:00.000Z');
    });

    it('should auto-generate a UUID threatId when not provided', () => {
      // Arrange — sin threatId explícito
      const props: ThreatProps = { ...baseProps };

      // Act
      const threat = Threat.create(props);

      // Assert — VERIFICAR: el id generado es un UUID válido
      expect(threat.threatId).toBeDefined();
      expect(threat.threatId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    it('should auto-generate an ISO timestamp when not provided', () => {
      // Arrange
      const before = Date.now();
      const props: ThreatProps = { ...baseProps };

      // Act
      const threat = Threat.create(props);

      // Assert
      const after = Date.now();
      const threatTime = new Date(threat.timestamp!).getTime();
      expect(threatTime).toBeGreaterThanOrEqual(before);
      expect(threatTime).toBeLessThanOrEqual(after);
    });

    it('should allow undefined optional fields (targetIp, metadata)', () => {
      // Arrange — sin campos opcionales
      const props: ThreatProps = { ...baseProps };

      // Act
      const threat = Threat.create(props);

      // Assert
      expect(threat.targetIp).toBeUndefined();
      expect(threat.metadata).toBeUndefined();
    });

    it('should create different threats with unique auto-generated ids', () => {
      // Act
      const threat1 = Threat.create(baseProps);
      const threat2 = Threat.create(baseProps);

      // Assert — cada instancia tiene su propio ID
      expect(threat1.threatId).not.toBe(threat2.threatId);
    });
  });

  // =========================================================================
  // isHighSeverity() — VALIDAR regla de negocio
  // =========================================================================
  describe('isHighSeverity()', () => {
    it('should return true when severity is "high"', () => {
      // VALIDAR: amenazas de severidad alta deben identificarse correctamente
      const threat = Threat.create({ ...baseProps, severity: 'high' });
      expect(threat.isHighSeverity()).toBe(true);
    });

    it('should return true when severity is "critical"', () => {
      // VALIDAR: crítico también es high severity
      const threat = Threat.create({ ...baseProps, severity: 'critical' });
      expect(threat.isHighSeverity()).toBe(true);
    });

    it('should return false when severity is "medium"', () => {
      // VALIDAR: medium NO es high severity
      const threat = Threat.create({ ...baseProps, severity: 'medium' });
      expect(threat.isHighSeverity()).toBe(false);
    });

    it('should return false when severity is "low"', () => {
      // VALIDAR: low NO es high severity
      const threat = Threat.create({ ...baseProps, severity: 'low' });
      expect(threat.isHighSeverity()).toBe(false);
    });
  });

  // =========================================================================
  // isCritical() — VALIDAR regla de negocio
  // =========================================================================
  describe('isCritical()', () => {
    it('should return true only when severity is "critical"', () => {
      // VALIDAR: solo crítico = isCritical
      const threat = Threat.create({ ...baseProps, severity: 'critical' });
      expect(threat.isCritical()).toBe(true);
    });

    it('should return false when severity is "high"', () => {
      const threat = Threat.create({ ...baseProps, severity: 'high' });
      expect(threat.isCritical()).toBe(false);
    });

    it('should return false when severity is "medium"', () => {
      const threat = Threat.create({ ...baseProps, severity: 'medium' });
      expect(threat.isCritical()).toBe(false);
    });

    it('should return false when severity is "low"', () => {
      const threat = Threat.create({ ...baseProps, severity: 'low' });
      expect(threat.isCritical()).toBe(false);
    });
  });

  // =========================================================================
  // toPlainObject() — VERIFICAR serialización
  // =========================================================================
  describe('toPlainObject()', () => {
    it('should return a plain object with all fields', () => {
      // Arrange
      const props: ThreatProps = {
        threatId: 'plain-id-123',
        type: 'ddos',
        severity: 'critical',
        sourceIp: '1.2.3.4',
        targetIp: '5.6.7.8',
        description: 'DDoS attack',
        metadata: { packets: 10000 },
        timestamp: '2026-02-23T12:00:00.000Z',
      };

      // Act
      const threat = Threat.create(props);
      const plain = threat.toPlainObject();

      // Assert — VERIFICAR: la serialización incluye todos los campos
      expect(plain).toEqual({
        threatId: 'plain-id-123',
        type: 'ddos',
        severity: 'critical',
        sourceIp: '1.2.3.4',
        targetIp: '5.6.7.8',
        description: 'DDoS attack',
        metadata: { packets: 10000 },
        timestamp: '2026-02-23T12:00:00.000Z',
      });
    });

    it('should return undefined for omitted optional fields in plain object', () => {
      // Arrange
      const threat = Threat.create({
        threatId: 'id-no-optional',
        type: 'phishing',
        severity: 'low',
        sourceIp: '9.9.9.9',
        description: 'Phishing email',
      });

      // Act
      const plain = threat.toPlainObject();

      // Assert
      expect(plain.targetIp).toBeUndefined();
      expect(plain.metadata).toBeUndefined();
    });

    it('should not expose private constructor fields beyond the defined interface', () => {
      // VERIFICAR: toPlainObject solo expone los campos del contrato
      const threat = Threat.create(baseProps);
      const plain = threat.toPlainObject();

      expect(Object.keys(plain)).toEqual([
        'threatId', 'type', 'severity', 'sourceIp', 'targetIp',
        'description', 'metadata', 'timestamp',
      ]);
    });
  });

  // =========================================================================
  // Immutabilidad — VERIFICAR que la entidad no expone mutadores ni setters
  // =========================================================================
  describe('immutability', () => {
    it('should not expose setter methods — all state is set via create() factory', () => {
      // VERIFICAR: la entidad no tiene setters; toda mutación va por factory
      const threat = Threat.create(baseProps);

      // La clase solo expone las propiedades públicas readonly definidas en el constructor
      // y los métodos de dominio — no hay ningún método set*
      expect(typeof (threat as unknown as Record<string, unknown>)['setType']).toBe('undefined');
      expect(typeof (threat as unknown as Record<string, unknown>)['setSeverity']).toBe('undefined');
      expect(typeof (threat as unknown as Record<string, unknown>)['setDescription']).toBe('undefined');
    });

    it('should be an instance of Threat — private constructor enforces factory pattern', () => {
      const threat = Threat.create(baseProps);
      expect(threat).toBeInstanceOf(Threat);
    });
  });
});
