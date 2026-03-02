// Tipo de prueba: Integración
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LocalStorageAdapter } from '../local-storage.adapter';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocalStorageAdapter]
    });
    adapter = TestBed.inject(LocalStorageAdapter);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('set', () => {
    it('should store a value in localStorage', () => {
      adapter.set('testKey', 'testValue');
      
      expect(localStorage.getItem('testKey')).toBe('testValue');
    });

    it('should overwrite existing value', () => {
      adapter.set('key', 'value1');
      adapter.set('key', 'value2');
      
      expect(localStorage.getItem('key')).toBe('value2');
    });

    it('should handle JSON stringified objects', () => {
      const obj = JSON.stringify({ name: 'test', id: 123 });
      adapter.set('jsonKey', obj);
      
      expect(localStorage.getItem('jsonKey')).toBe(obj);
    });
  });

  describe('get', () => {
    it('should retrieve a value from localStorage', () => {
      localStorage.setItem('existingKey', 'existingValue');
      
      const result = adapter.get('existingKey');
      
      expect(result).toBe('existingValue');
    });

    it('should return null for non-existent key', () => {
      const result = adapter.get('nonExistentKey');
      
      expect(result).toBeNull();
    });

    it('should retrieve JSON stringified objects', () => {
      const obj = { name: 'test', id: 456 };
      localStorage.setItem('jsonKey', JSON.stringify(obj));
      
      const result = adapter.get('jsonKey');
      
      expect(JSON.parse(result!)).toEqual(obj);
    });
  });

  describe('remove', () => {
    it('should remove a key from localStorage', () => {
      localStorage.setItem('toRemove', 'value');
      
      adapter.remove('toRemove');
      
      expect(localStorage.getItem('toRemove')).toBeNull();
    });

    it('should not throw when removing non-existent key', () => {
      expect(() => adapter.remove('nonExistent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all items from localStorage', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      localStorage.setItem('key3', 'value3');
      
      adapter.clear();
      
      expect(localStorage.length).toBe(0);
    });

    it('should not throw when localStorage is already empty', () => {
      expect(() => adapter.clear()).not.toThrow();
    });
  });
});
