import '@angular/compiler';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join, basename } from 'node:path';
import { beforeAll, afterEach } from 'vitest';

function buildSrcFileMap(): Map<string, string> {
  const map = new Map<string, string>();
  const srcDir = resolve(process.cwd(), 'src');

  function scan(dir: string): void {
    try {
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        try {
          if (statSync(fullPath).isDirectory()) {
            scan(fullPath);
          } else if (/\.(html|css|scss)$/.test(entry)) {
            map.set(entry, readFileSync(fullPath, 'utf-8'));
          }
        } catch {
        }
      }
    } catch {
    }
  }

  scan(srcDir);
  return map;
}

const srcFileMap = buildSrcFileMap();

function componentResourceFetcher(url: string): Promise<Response> {
  try {
    let content = '';
    if (url.startsWith('file://')) {
      content = readFileSync(fileURLToPath(url), 'utf-8');
    } else {
      content = srcFileMap.get(basename(url)) ?? '';
    }
    return Promise.resolve({ text: () => Promise.resolve(content) } as unknown as Response);
  } catch {
    return Promise.resolve({ text: () => Promise.resolve('') } as unknown as Response);
  }
}

beforeAll(async () => {
  await resolveComponentResources(componentResourceFetcher);
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
});

afterEach(() => {
  TestBed.resetTestingModule();
});
