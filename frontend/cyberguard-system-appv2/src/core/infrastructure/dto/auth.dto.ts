/**
 * DTOs (Data Transfer Objects) para la API de autenticación.
 * Representan exactamente la estructura de datos que viene/va al backend.
 * 
 * IMPORTANTE: Los DTOs son diferentes de los modelos de dominio.
 * - DTOs: Contratos con la API (pueden cambiar si el backend cambia)
 * - Domain Models: Representación interna de la aplicación (estables)
 */

/**
 * DTO para la petición de login
 * POST /api/auth/login
 */
export interface LoginRequestDto {
  readonly username: string;
  readonly password: string;
}

/**
 * DTO para la respuesta del usuario en login
 */
export interface UserDto {
  readonly username: string;
  readonly role: string;
}

/**
 * DTO para la respuesta de login exitoso
 * Response 200 de POST /api/auth/login
 */
export interface LoginResponseDto {
  readonly token: string;
  readonly user: UserDto;
}

/**
 * DTO para respuestas de error de la API
 */
export interface ApiErrorDto {
  readonly error: string;
  readonly message?: string;
  readonly details?: Record<string, string>;
}
