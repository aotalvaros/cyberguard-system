import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../../core/infrastructure/services/websocket.service';
import { AlertMessage } from '../../../core/domain/models/alert-message.model';
import { AlertsDomainService } from '../../../core/domain/services/alerts-domain.service';
import { AuthService } from '../../../core/infrastructure/services/auth.service';
import { DeleteThreatUseCase } from '../../../core/application/use-cases/delete-threat.use-case';
import { SEVERITY_LIST } from '@environments/constants';
import { ConnectionStatus } from '../../../core/domain/ports/websocket.repository';

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  CONNECTED:    '● Conectado',
  DISCONNECTED: '○ Desconectado',
  CONNECTING:   '◌ Reconectando...',
  ERROR:        '✕ Sin conexión',
};

/**
 * ⚠️ HUMAN CHECK: Componente de alertas con validación de rol
 * 
 * Arquitectura aplicada:
 * - Lógica de negocio delegada a AlertsDomainService (SRP)
 * - Eliminación real via DeleteThreatUseCase que llama al backend
 * - Validación visual: botones de eliminar SOLO visibles para admin
 * 
 * Decisión de diseño para deleteAlert():
 * 1. Primero intentamos eliminar del backend (DELETE /api/threats/:id)
 * 2. Si el backend responde OK → eliminamos de la lista local
 * 3. Si falla → eliminamos local de todas formas (graceful degradation)
 * 
 * El getter isAdmin evita llamadas repetidas al servicio de auth.
 * SEVERITY_LIST viene de constants.ts para evitar duplicación.
 */
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
  private authService = inject(AuthService);
  private deleteThreatUseCase = inject(DeleteThreatUseCase);
  private subscription?: Subscription;
  private cdr = inject(ChangeDetectorRef);

  alerts: AlertMessage[] = [];
  filteredAlerts: AlertMessage[] = [];
  connectionStatus: ConnectionStatus = 'DISCONNECTED';
  readonly statusLabel = STATUS_LABELS;

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
    this.wsService.getConnectionStatus$().subscribe(status => {
      this.connectionStatus = status;
      this.cdr.detectChanges();
    });
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

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  deleteAlert(alert: AlertMessage): void {
    if (!this.isAdmin) return;
    
    const threatId = alert.data?.threatId;
    if (threatId) {
      // Llamar al servicio DELETE del backend
      this.deleteThreatUseCase.execute(threatId).subscribe({
        next: () => {
          // Eliminar de la lista local después de éxito en backend
          this.wsService.deleteMessage(alert.eventId);
        },
        error: (err) => {
          console.error('Error al eliminar amenaza del backend:', err);
          // Si falla el backend, aún eliminamos localmente
          this.wsService.deleteMessage(alert.eventId);
        }
      });
    } else {
      // Si no tiene threatId, solo eliminar localmente
      this.wsService.deleteMessage(alert.eventId);
    }
  }

  clearAll(): void {
    if (!this.isAdmin) return;
    
    if (confirm('¿Eliminar todas las alertas?')) {
      // Para cada alerta con threatId, intentar eliminar del backend
      const alertsWithThreatId = this.alerts.filter(a => a.data?.threatId);
      alertsWithThreatId.forEach(alert => {
        this.deleteThreatUseCase.execute(alert.data.threatId).subscribe({
          error: (err) => console.error('Error eliminando threat:', alert.data.threatId, err)
        });
      });
      // Limpiar todas las alertas locales
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

  getUniqueSeverities(): readonly string[] {
    return SEVERITY_LIST;
  }
}
