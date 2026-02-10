import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WsService } from '../services/ws.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  messages: any[] = [];
  private sub: Subscription | null = null;

  constructor(private ws: WsService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (!this.auth.isAdmin()) {
      this.router.navigate(['/autenticacion']);
      return;
    }
    this.ws.connect();
    this.sub = this.ws.messages$.subscribe((m) => {
      // keep newest on top
      this.messages.unshift({ receivedAt: new Date().toISOString(), payload: m });
      if (this.messages.length > 50) this.messages.pop();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.ws.disconnect();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/autenticacion']);
  }
}
