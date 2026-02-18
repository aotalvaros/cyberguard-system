import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../../core/infrastructure/services/websocket.service';
import { AlertMessage } from '../../../core/domain/models/alert-message.model';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.css'
})
export class AlertsComponent implements OnInit, OnDestroy {
  private wsService = inject(WebSocketService);
  private subscription?: Subscription;
  private cdr = inject(ChangeDetectorRef);

  alerts: AlertMessage[] = [];
  filteredAlerts: AlertMessage[] = [];
  connected = false;

  // Filtros
  searchTerm = '';
  filterType = '';
  filterSeverity = '';

  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  ngOnInit(): void {
    this.subscription = this.wsService.getMessages$().subscribe(messages => {
      this.alerts = messages;
      this.applyFilters();
      this.cdr.detectChanges();
    });
    this.connected = this.wsService.isConnected();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  applyFilters(): void {
    let filtered = [...this.alerts];

    // Filtro por búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.data.description.toLowerCase().includes(term) ||
        alert.data.sourceIp.includes(term) ||
        alert.data.threatId.toLowerCase().includes(term)
      );
    }

    // Filtro por tipo
    if (this.filterType) {
      filtered = filtered.filter(alert => alert.data.type === this.filterType);
    }

    // Filtro por severidad
    if (this.filterSeverity) {
      filtered = filtered.filter(alert => alert.data.severity === this.filterSeverity);
    }

    this.filteredAlerts = filtered;
    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    this.currentPage = 1;
  }

  get paginatedAlerts(): AlertMessage[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredAlerts.slice(start, end);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  deleteAlert(eventId: string): void {
    this.wsService.deleteMessage(eventId);
  }

  clearAll(): void {
    if (confirm('¿Eliminar todas las alertas?')) {
      this.wsService.clearAll();
    }
  }

  exportToJSON(): void {
    const dataStr = JSON.stringify(this.filteredAlerts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alerts-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  getStats() {
    if (!this.filteredAlerts || this.filteredAlerts.length === 0) {
      return { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    }

    const total = this.filteredAlerts.length;
    const critical = this.filteredAlerts.filter(a => a.data?.severity === 'critical').length;
    const high = this.filteredAlerts.filter(a => a.data?.severity === 'high').length;
    const medium = this.filteredAlerts.filter(a => a.data?.severity === 'medium').length;
    const low = this.filteredAlerts.filter(a => a.data?.severity === 'low').length;

    return { total, critical, high, medium, low };
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

  getUniqueTypes(): string[] {
    if (!this.alerts || this.alerts.length === 0) return [];
    return [...new Set(this.alerts.map(a => a.data?.type).filter(Boolean))];
  }

  getUniqueSeverities(): string[] {
    return ['low', 'medium', 'high', 'critical'];
  }
}
