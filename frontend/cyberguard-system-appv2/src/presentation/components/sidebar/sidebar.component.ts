import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { GetCurrentUserUseCase } from '../../../core/application/use-cases/get-current-user.use-case';
import { LogoutUseCase } from '../../../core/application/use-cases/logout.use-case';
import { ROLES } from '../../../environments/constants';

const SIDEBAR_COLLAPSED_KEY = 'cyberguard_sidebar_collapsed';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  adminOnly: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent implements OnInit {
  private getCurrentUserUseCase = inject(GetCurrentUserUseCase);
  private logoutUseCase = inject(LogoutUseCase);
  private router = inject(Router);

  collapsed = signal(false);

  currentUser = computed(() => this.getCurrentUserUseCase.execute());

  isAdmin = computed(() => this.currentUser()?.role === ROLES.ADMIN);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',        icon: '📊', route: '/dashboard',     adminOnly: false },
    { label: 'Reportar Amenaza', icon: '🚨', route: '/report-threat',  adminOnly: false },
    { label: 'Incidentes',       icon: '📋', route: '/incidents',      adminOnly: false },
    { label: 'Gestión Usuarios', icon: '👥', route: '/users',          adminOnly: true  },
    { label: 'Perfil Personal',  icon: '👤', route: '/profile',        adminOnly: false },
  ];

  visibleItems = computed(() =>
    this.navItems.filter(item => !item.adminOnly || this.isAdmin())
  );

  ngOnInit(): void {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      this.collapsed.set(stored === 'true');
    }
  }

  toggleCollapse(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  }

  isActive(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '?');
  }

  logout(): void {
    this.logoutUseCase.execute();
    this.router.navigate(['/autenticacion']);
  }
}
