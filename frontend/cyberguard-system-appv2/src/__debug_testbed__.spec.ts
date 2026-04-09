import '@angular/compiler';
import { describe, it, expect, beforeAll } from 'vitest';
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

beforeAll(() => {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
});

describe('Debug TestBed with inline init', () => {
  it('test1 - basic TestBed', () => {
    TestBed.configureTestingModule({ providers: [] });
    expect(true).toBe(true);
  });

  it('test2 - provideHttpClient', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    const http = TestBed.inject(HttpClient);
    expect(http).toBeDefined();
  });
});
