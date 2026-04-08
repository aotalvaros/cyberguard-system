import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LogoutUseCase } from '../../../core/application/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from '../../../core/application/use-cases/get-current-user.use-case';
import { AlertsComponent } from '../alerts/alerts.component';
import { StatisticsWidgetComponent } from './statistics-widget/statistics-widget.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AlertsComponent, StatisticsWidgetComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private logoutUseCase = inject(LogoutUseCase);
  private getCurrentUserUseCase = inject(GetCurrentUserUseCase);
  private router = inject(Router);

  user = this.getCurrentUserUseCase.execute();

  logout(): void {
    this.logoutUseCase.execute();
    this.router.navigate(['/autenticacion']);
  }
}
