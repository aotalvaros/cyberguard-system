import '@angular/compiler';
import { getTestBed, TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { afterEach } from 'vitest';

// Polyfill CloseEvent for jsdom
if (typeof globalThis.CloseEvent === 'undefined') {
  (globalThis as any).CloseEvent = class CloseEvent extends Event {
    code: number;
    reason: string;
    wasClean: boolean;
    constructor(
      type: string,
      init?: { code?: number; reason?: string; wasClean?: boolean }
    ) {
      super(type);
      this.code = init?.code ?? 1000;
      this.reason = init?.reason ?? '';
      this.wasClean = init?.wasClean ?? true;
    }
  };
}

// Initialize TestBed at module scope and store on globalThis for cross-module access
const tb = getTestBed();
tb.initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting()
);
(globalThis as any).__ANGULAR_TESTBED__ = tb;

afterEach(() => {
  TestBed.resetTestingModule();
});
