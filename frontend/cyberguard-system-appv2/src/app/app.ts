import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../core/infrastructure/services/auth.service';
import { WebSocketService } from '../core/infrastructure/services/websocket.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private authService = inject(AuthService);
  private wsService = inject(WebSocketService);
  
  protected readonly title = signal('cyberguard-system-app');

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.wsService.connect();
    }
  }
}
