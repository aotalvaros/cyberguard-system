import { Routes } from '@angular/router';
import { AutenticacionComponent } from './autenticacion/autenticacion.component';
import { AdminDashboardComponent } from './admin/admin-dashboard.component';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
	{ path: 'autenticacion', component: AutenticacionComponent },
	{ path: 'dashboard', component: AdminDashboardComponent, canActivate: [adminGuard] },
	{ path: '', redirectTo: 'autenticacion', pathMatch: 'full' }
];
