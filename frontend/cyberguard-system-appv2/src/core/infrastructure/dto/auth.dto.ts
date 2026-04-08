export interface LoginRequestDto {
  readonly username: string;
  readonly password: string;
}

export interface UserDto {
  readonly username: string;
  readonly role: string;
}

export interface LoginResponseDto {
  readonly token: string;
  readonly user: UserDto;
}

export interface ApiErrorDto {
  readonly error: string;
  readonly message?: string;
  readonly details?: Record<string, string>;
}
