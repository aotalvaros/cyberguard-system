import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GetCurrentUserUseCase } from '../../../core/application/use-cases/get-current-user.use-case';
import { AlertsComponent } from '../alerts/alerts.component';
import { StatisticsWidgetComponent } from './statistics-widget/statistics-widget.component';
import { NotificationPreferencesComponent } from '../notification-preferences/notification-preferences.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AlertsComponent, StatisticsWidgetComponent, NotificationPreferencesComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private getCurrentUserUseCase = inject(GetCurrentUserUseCase);

  user = this.getCurrentUserUseCase.execute();
}
