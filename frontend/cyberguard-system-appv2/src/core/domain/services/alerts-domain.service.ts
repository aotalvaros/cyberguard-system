import { Injectable } from '@angular/core';
import { AlertMessage } from '../models/alert-message.model';

// ⚠️ HUMAN CHECK:
// Domain Service con lógica de negocio pura para alertas
@Injectable({
  providedIn: 'root'
})
export class AlertsDomainService {
  
  filterAlerts(
    alerts: AlertMessage[],
    searchTerm: string,
    filterType: string,
    filterSeverity: string
  ): AlertMessage[] {
    let filtered = [...alerts];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.data.description.toLowerCase().includes(term) ||
        alert.data.sourceIp.includes(term) ||
        alert.data.threatId.toLowerCase().includes(term)
      );
    }

    if (filterType) {
      filtered = filtered.filter(alert => alert.data.type === filterType);
    }

    if (filterSeverity) {
      filtered = filtered.filter(alert => alert.data.severity === filterSeverity);
    }

    return filtered;
  }

  calculateStats(alerts: AlertMessage[]) {
    if (!alerts || alerts.length === 0) {
      return { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    }

    const total = alerts.length;
    const critical = alerts.filter(a => a.data?.severity === 'critical').length;
    const high = alerts.filter(a => a.data?.severity === 'high').length;
    const medium = alerts.filter(a => a.data?.severity === 'medium').length;
    const low = alerts.filter(a => a.data?.severity === 'low').length;

    return { total, critical, high, medium, low };
  }

  getUniqueTypes(alerts: AlertMessage[]): string[] {
    if (!alerts || alerts.length === 0) return [];
    return [...new Set(alerts.map(a => a.data?.type).filter(Boolean))];
  }

  getSeverityClass(severity: string): string {
    const map: Record<string, string> = {
      'low': 'severity-low',
      'medium': 'severity-medium',
      'high': 'severity-high',
      'critical': 'severity-critical'
    };
    return map[severity] || 'severity-low';
  }

  formatDate(timestamp?: number): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  }

  exportToJSON(alerts: AlertMessage[]): void {
    const dataStr = JSON.stringify(alerts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alerts-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
