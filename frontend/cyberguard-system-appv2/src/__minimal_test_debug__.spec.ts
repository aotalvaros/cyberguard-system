import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';

@Injectable()
class SimpleService {
  getValue(): string { return 'hello'; }
}

describe('Minimal TestBed test', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SimpleService]
    });
  });

  it('should inject service', () => {
    const svc = TestBed.inject(SimpleService);
    expect(svc.getValue()).toBe('hello');
  });
});
