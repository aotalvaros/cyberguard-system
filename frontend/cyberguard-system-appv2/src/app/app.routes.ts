import { Routes } from '@angular/router';
import { authGuard } from '../presentation/guards/auth.guard';
import { adminGuard } from '../presentation/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/autenticacion',
    pathMatch: 'full'
  },
  {
    path: 'autenticacion',
    loadComponent: () => import('../presentation/components/autenticacion/autenticacion.component')
      .then(m => m.AutenticacionComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('../presentation/components/dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'report-threat',
    loadComponent: () => import('../presentation/components/report-threat/report-threat.component')
      .then(m => m.ReportThreatComponent),
    canActivate: [authGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('../presentation/components/user-management/user-management.component')
      .then(m => m.UserManagementComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'incidents',
    loadComponent: () => import('../presentation/components/incident-list/incident-list.component')
      .then(m => m.IncidentListComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/autenticacion'
  }
];
