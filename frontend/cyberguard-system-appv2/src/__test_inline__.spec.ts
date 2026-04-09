import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Injectable } from '@angular/core';

// Init directly in the test file
getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

@Injectable()
class SimpleService {
  getValue(): string { return 'hello'; }
}

describe('Inline init test', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [SimpleService]
    });
  });

  it('should inject service', () => {
    const svc = TestBed.inject(SimpleService);
    expect(svc.getValue()).toBe('hello');
  });
});
