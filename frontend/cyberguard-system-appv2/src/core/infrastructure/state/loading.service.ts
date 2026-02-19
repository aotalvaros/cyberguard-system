import { Injectable, signal, computed } from '@angular/core';

/**
 * Tipos de operaciones que pueden estar en progreso
 */
export type LoadingOperation = 
  | 'login'
  | 'logout'
  | 'reportThreat'
  | 'fetchThreats'
  | 'websocket'
  | 'generic';

/**
 * Estado de una operación de carga
 */
export interface LoadingState {
  readonly operation: LoadingOperation;
  readonly message?: string;
  readonly startedAt: Date;
}

/**
 * Servicio centralizado para manejar estados de carga en la aplicación.
 * 
 * Usa Angular Signals para proporcionar estado reactivo sin necesidad de 
 * suscripciones manuales, permitiendo que los componentes se actualicen
 * automáticamente cuando el estado cambia.
 * 
 * @example
 * ```typescript
 * // En un componente
 * readonly isLoading = this.loadingService.isLoading;
 * readonly loadingMessage = this.loadingService.loadingMessage;
 * 
 * // En el template
 * @if (isLoading()) {
 *   <spinner [message]="loadingMessage()" />
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  /** Operaciones activas actualmente */
  private activeOperations = signal<Map<LoadingOperation, LoadingState>>(new Map());

  /** 
   * Signal computada: true si hay alguna operación en progreso 
   */
  readonly isLoading = computed(() => this.activeOperations().size > 0);

  /**
   * Signal computada: mensaje de la operación actual (o undefined)
   */
  readonly loadingMessage = computed(() => {
    const operations = this.activeOperations();
    if (operations.size === 0) return undefined;
    
    // Retornar el mensaje de la primera operación activa
    const firstOp = operations.values().next().value;
    return firstOp?.message;
  });

  /**
   * Signal computada: lista de todas las operaciones activas
   */
  readonly activeOperationsList = computed(() => 
    Array.from(this.activeOperations().values())
  );

  /**
   * Signal computada: número de operaciones activas
   */
  readonly operationsCount = computed(() => this.activeOperations().size);

  /**
   * Inicia el tracking de una operación de carga
   */
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

  /**
   * Finaliza el tracking de una operación de carga
   */
  stopLoading(operation: LoadingOperation): void {
    this.activeOperations.update(ops => {
      const newMap = new Map(ops);
      newMap.delete(operation);
      return newMap;
    });
  }

  /**
   * Verifica si una operación específica está en progreso
   */
  isOperationLoading(operation: LoadingOperation): boolean {
    return this.activeOperations().has(operation);
  }

  /**
   * Limpia todas las operaciones de carga (útil para logout o reset)
   */
  clearAll(): void {
    this.activeOperations.set(new Map());
  }

  /**
   * Ejecuta una función async mientras trackea el loading automáticamente
   * 
   * @example
   * ```typescript
   * const result = await loadingService.withLoading(
   *   'login', 
   *   'Iniciando sesión...',
   *   () => authService.login(credentials)
   * );
   * ```
   */
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
