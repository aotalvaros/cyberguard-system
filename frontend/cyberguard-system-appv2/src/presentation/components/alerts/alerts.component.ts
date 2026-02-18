import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../../core/infrastructure/services/websocket.service';
import { AlertMessage } from '../../../core/domain/models/alert-message.model';
import { AlertsDomainService } from '../../../core/domain/services/alerts-domain.service';

// ⚠️ HUMAN CHECK:
// Componente refactorizado - lógica de negocio movida a AlertsDomainService
@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.css'
})
export class AlertsComponent implements OnInit, OnDestroy {
  private wsService = inject(WebSocketService);
  private alertsDomain = inject(AlertsDomainService);
  private subscription?: Subscription;
  private cdr = inject(ChangeDetectorRef);

  alerts: AlertMessage[] = [];
  filteredAlerts: AlertMessage[] = [];
  connected = false;

  searchTerm = '';
  filterType = '';
  filterSeverity = '';

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
    this.filteredAlerts = this.alertsDomain.filterAlerts(
      this.alerts,
      this.searchTerm,
      this.filterType,
      this.filterSeverity
    );
    this.totalPages = Math.ceil(this.filteredAlerts.length / this.pageSize);
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
    this.alertsDomain.exportToJSON(this.filteredAlerts);
  }

  getStats() {
    return this.alertsDomain.calculateStats(this.filteredAlerts);
  }

  getSeverityClass(severity: string): string {
    return this.alertsDomain.getSeverityClass(severity);
  }

  formatDate(timestamp?: number): string {
    return this.alertsDomain.formatDate(timestamp);
  }

  getUniqueTypes(): string[] {
    return this.alertsDomain.getUniqueTypes(this.alerts);
  }

  getUniqueSeverities(): string[] {
    return ['low', 'medium', 'high', 'critical'];
  }
}
