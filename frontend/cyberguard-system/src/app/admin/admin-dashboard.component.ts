import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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

  constructor(private ws: WsService, private auth: AuthService, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (!this.auth.isAdmin()) {
      this.router.navigate(['/autenticacion']);
      return;
    }
    this.ws.connect();
    this.sub = this.ws.messages$.subscribe((list) => {
      // `list` is an array of payloads (newest first)
      this.messages = (list || []).slice(0, 50);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.ws.disconnect();
  }

  deleteMessage(index: number) {
    this.ws.deleteMessage(index);
  }

  clearAll() {
    if (confirm('¿Eliminar todas las alertas?')) {
      this.ws.clearAll();
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/autenticacion']);
  }
}
