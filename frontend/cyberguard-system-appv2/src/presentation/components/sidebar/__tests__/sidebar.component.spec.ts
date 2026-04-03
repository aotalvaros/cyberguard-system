import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';

import { SidebarComponent } from '../sidebar.component';
import { GetCurrentUserUseCase } from '../../../../core/application/use-cases/get-current-user.use-case';
import { LogoutUseCase } from '../../../../core/application/use-cases/logout.use-case';

const SIDEBAR_COLLAPSED_KEY = 'cyberguard_sidebar_collapsed';

async function buildFixture(
  user: { username: string; role: string } | null = { username: 'admin', role: 'admin' }
): Promise<ComponentFixture<SidebarComponent>> {
  await TestBed.configureTestingModule({
    imports: [SidebarComponent],
    providers: [
      provideRouter([]),
      { provide: GetCurrentUserUseCase, useValue: { execute: vi.fn().mockReturnValue(user) } },
      { provide: LogoutUseCase,         useValue: { execute: vi.fn() } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(SidebarComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SidebarComponent', () => {

  afterEach(() => {
    localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
    TestBed.resetTestingModule();
  });

  // ─── VISIBILIDAD POR ROL ──────────────────────────────────────────────────

  describe('visibleItems — admin', () => {
    let fixture: ComponentFixture<SidebarComponent>;
    let component: SidebarComponent;

    beforeEach(async () => {
      fixture   = await buildFixture({ username: 'admin', role: 'admin' });
      component = fixture.componentInstance;
    });

    it('should show all 4 nav items for admin', () => {
      expect(component.visibleItems()).toHaveLength(4);
    });

    it('should include Gestión Usuarios for admin', () => {
      const labels = component.visibleItems().map(i => i.label);
      expect(labels).toContain('Gestión Usuarios');
    });

    it('should include Dashboard, Reportar Amenaza and Incidentes', () => {
      const labels = component.visibleItems().map(i => i.label);
      expect(labels).toContain('Dashboard');
      expect(labels).toContain('Reportar Amenaza');
      expect(labels).toContain('Incidentes');
    });
  });

  describe('visibleItems — non-admin roles', () => {
    it.each([
      ['soc_analyst'],
      ['incident_handler'],
      ['incident_manager'],
      ['ciso'],
    ])('should hide Gestión Usuarios for role %s', async (role) => {
      const fixture   = await buildFixture({ username: 'user', role });
      const component = fixture.componentInstance;

      expect(component.visibleItems()).toHaveLength(3);
      const labels = component.visibleItems().map(i => i.label);
      expect(labels).not.toContain('Gestión Usuarios');
    });
  });

  // ─── TODOS LOS ITEMS SON ACCESIBLES ──────────────────────────────────────

  describe('navItems routes', () => {
    it('should have /dashboard route', async () => {
      const fixture   = await buildFixture();
      const component = fixture.componentInstance;
      const routes = component.navItems.map(i => i.route);
      expect(routes).toContain('/dashboard');
    });

    it('should have /report-threat route', async () => {
      const fixture   = await buildFixture();
      const component = fixture.componentInstance;
      const routes = component.navItems.map(i => i.route);
      expect(routes).toContain('/report-threat');
    });

    it('should have /incidents route', async () => {
      const fixture   = await buildFixture();
      const component = fixture.componentInstance;
      const routes = component.navItems.map(i => i.route);
      expect(routes).toContain('/incidents');
    });

    it('should mark /users as adminOnly', async () => {
      const fixture   = await buildFixture();
      const component = fixture.componentInstance;
      const usersItem = component.navItems.find(i => i.route === '/users');
      expect(usersItem?.adminOnly).toBe(true);
    });
  });

  // ─── COLAPSO / EXPANSIÓN ─────────────────────────────────────────────────

  describe('toggleCollapse', () => {
    let fixture: ComponentFixture<SidebarComponent>;
    let component: SidebarComponent;

    beforeEach(async () => {
      fixture   = await buildFixture();
      component = fixture.componentInstance;
    });

    it('should start expanded by default (no localStorage value)', () => {
      expect(component.collapsed()).toBe(false);
    });

    it('should collapse when toggleCollapse is called', () => {
      component.toggleCollapse();
      expect(component.collapsed()).toBe(true);
    });

    it('should expand again on second toggle', () => {
      component.toggleCollapse();
      component.toggleCollapse();
      expect(component.collapsed()).toBe(false);
    });

    it('should persist collapsed=true to localStorage', () => {
      component.toggleCollapse();
      expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('true');
    });

    it('should persist collapsed=false to localStorage', () => {
      component.toggleCollapse(); // → true
      component.toggleCollapse(); // → false
      expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('false');
    });
  });

  // ─── PERSISTENCIA localStorage ──────────────────────────────────────────

  describe('ngOnInit — localStorage persistence', () => {
    it('should restore collapsed=true from localStorage on init', async () => {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
      const fixture   = await buildFixture();
      const component = fixture.componentInstance;
      expect(component.collapsed()).toBe(true);
    });

    it('should restore collapsed=false from localStorage on init', async () => {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'false');
      const fixture   = await buildFixture();
      const component = fixture.componentInstance;
      expect(component.collapsed()).toBe(false);
    });
  });

  // ─── USUARIO ACTUAL ──────────────────────────────────────────────────────

  describe('currentUser', () => {
    it('should expose currentUser from use case', async () => {
      const fixture   = await buildFixture({ username: 'admin', role: 'admin' });
      const component = fixture.componentInstance;
      expect(component.currentUser()?.username).toBe('admin');
    });

    it('should return null if not logged in', async () => {
      const fixture   = await buildFixture(null);
      const component = fixture.componentInstance;
      expect(component.currentUser()).toBeNull();
    });
  });

  // ─── isAdmin ─────────────────────────────────────────────────────────────

  describe('isAdmin', () => {
    it('should be true for admin role', async () => {
      const fixture   = await buildFixture({ username: 'admin', role: 'admin' });
      const component = fixture.componentInstance;
      expect(component.isAdmin()).toBe(true);
    });

    it('should be false for non-admin role', async () => {
      const fixture   = await buildFixture({ username: 'user', role: 'soc_analyst' });
      const component = fixture.componentInstance;
      expect(component.isAdmin()).toBe(false);
    });
  });

  // ─── isActive ────────────────────────────────────────────────────────────

  describe('isActive', () => {
    it('should return false for a route that does not match / (default url)', async () => {
      const fixture   = await buildFixture();
      const component = fixture.componentInstance;
      // provideRouter([]) starts at '/'
      expect(component.isActive('/dashboard')).toBe(false);
    });

    it('should return true for / when router url is /', async () => {
      const fixture   = await buildFixture();
      const component = fixture.componentInstance;
      expect(component.isActive('/')).toBe(true);
    });
  });

});

