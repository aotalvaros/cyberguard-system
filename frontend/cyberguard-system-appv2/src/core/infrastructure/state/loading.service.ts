import { Injectable, signal, computed } from '@angular/core';

export type LoadingOperation =
  | 'login'
  | 'logout'
  | 'reportThreat'
  | 'fetchThreats'
  | 'websocket'
  | 'generic';

export interface LoadingState {
  readonly operation: LoadingOperation;
  readonly message?: string;
  readonly startedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class LoadingService {

  private activeOperations = signal<Map<LoadingOperation, LoadingState>>(new Map());

  readonly isLoading = computed(() => this.activeOperations().size > 0);

  readonly loadingMessage = computed(() => {
    const operations = this.activeOperations();
    if (operations.size === 0) return undefined;

    const firstOp = operations.values().next().value;
    return firstOp?.message;
  });

  readonly activeOperationsList = computed(() =>
    Array.from(this.activeOperations().values())
  );

  readonly operationsCount = computed(() => this.activeOperations().size);

  startLoading(operation: LoadingOperation, message?: string): void {
    this.activeOperations.update(ops => {
      const newMap = new Map(ops);
      newMap.set(operation, {
        operation,
        message,
        startedAt: new Date()
      });
      return newMap;
    });
  }

  stopLoading(operation: LoadingOperation): void {
    this.activeOperations.update(ops => {
      const newMap = new Map(ops);
      newMap.delete(operation);
      return newMap;
    });
  }

  isOperationLoading(operation: LoadingOperation): boolean {
    return this.activeOperations().has(operation);
  }

  clearAll(): void {
    this.activeOperations.set(new Map());
  }

  async withLoading<T>(
    operation: LoadingOperation,
    message: string,
    fn: () => Promise<T>
  ): Promise<T> {
    this.startLoading(operation, message);
    try {
      return await fn();
    } finally {
      this.stopLoading(operation);
    }
  }
}
