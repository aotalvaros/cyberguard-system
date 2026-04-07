export interface NotifTemplate {
  subject: string;
  body: string;
}

const TEMPLATES: Record<string, NotifTemplate> = {
  malware: {
    subject: 'CyberGuard: Malware Detectado',
    body: 'Se ha detectado actividad de malware en el sistema. Severidad: {{severity}}. IP origen: {{sourceIp}}. {{description}}. Revise el panel de alertas inmediatamente.',
  },
  phishing: {
    subject: 'CyberGuard: Intento de Phishing',
    body: 'Se ha detectado un intento de phishing. Severidad: {{severity}}. IP origen: {{sourceIp}}. {{description}}. Verifique los accesos recientes.',
  },
  ddos: {
    subject: 'CyberGuard: Ataque DDoS en Curso',
    body: 'Se está registrando un ataque DDoS. Severidad: {{severity}}. IP origen: {{sourceIp}}. {{description}}. El sistema puede experimentar degradación.',
  },
  intrusion: {
    subject: 'CyberGuard: Intrusión Detectada',
    body: 'Se ha detectado una intrusión en el sistema. Severidad: {{severity}}. IP origen: {{sourceIp}}. {{description}}. Tome medidas inmediatas.',
  },
  other: {
    subject: 'CyberGuard: Alerta de Seguridad',
    body: 'Se ha registrado un evento de seguridad. Severidad: {{severity}}. IP origen: {{sourceIp}}. {{description}}. Revise el panel de alertas.',
  },
};

export const selectTemplate = (type: string): NotifTemplate =>
  TEMPLATES[type.toLowerCase()] ?? TEMPLATES['other']!;

export const renderTemplate = (
  template: NotifTemplate,
  vars: Record<string, string>,
): NotifTemplate => ({
  subject: template.subject,
  body: Object.entries(vars).reduce(
    (text, [key, val]) => text.replace(new RegExp(`{{${key}}}`, 'g'), val),
    template.body,
  ),
});
