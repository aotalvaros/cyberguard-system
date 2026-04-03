import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../core/infrastructure/services/auth.service';
import { WebSocketService } from '../core/infrastructure/services/websocket.service';
import { GetCurrentUserUseCase } from '../core/application/use-cases/get-current-user.use-case';
import { SidebarComponent } from '../presentation/components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private authService = inject(AuthService);
  private wsService = inject(WebSocketService);
  private getCurrentUserUseCase = inject(GetCurrentUserUseCase);
  private router = inject(Router);

  protected readonly title = signal('cyberguard-system-app');

  // Reactive current URL via NavigationEnd events
  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  /** Show sidebar only when the user is authenticated and not on the login page */
  showSidebar = computed(() => {
    const url = this.currentUrl() ?? '';
    return !url.includes('/autenticacion') && !!this.getCurrentUserUseCase.execute();
  });

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.wsService.connect();
    }
  }
}
