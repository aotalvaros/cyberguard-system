import { selectTemplate } from '../../notifications/category-template.strategy';

describe('CategoryTemplateStrategy', () => {
  it('should return malware template for "malware"', () => {
    const t = selectTemplate('malware');
    expect(t.subject).toContain('Malware');
    expect(t.body).toBeTruthy();
  });

  it('should return phishing template for "phishing"', () => {
    const t = selectTemplate('phishing');
    expect(t.subject).toContain('Phishing');
  });

  it('should return ddos template for "ddos"', () => {
    const t = selectTemplate('ddos');
    expect(t.subject).toContain('DDoS');
  });

  it('should return intrusion template for "intrusion"', () => {
    const t = selectTemplate('intrusion');
    expect(t.subject).toContain('Intrusi');
  });

  it('should return other template for "other"', () => {
    const t = selectTemplate('other');
    expect(t.subject).toBeTruthy();
    expect(t.body).toBeTruthy();
  });

  it('should fallback to "other" template for unknown types', () => {
    const t = selectTemplate('unknown-type');
    const other = selectTemplate('other');
    expect(t.subject).toBe(other.subject);
  });

  it('each type should have a different subject', () => {
    const types = ['malware', 'phishing', 'ddos', 'intrusion'];
    const subjects = types.map(t => selectTemplate(t).subject);
    const unique = new Set(subjects);
    expect(unique.size).toBe(types.length);
  });
});
