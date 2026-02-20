export interface TokenService {
  generateToken(payload: TokenPayload): string;
  verifyToken(token: string): TokenPayload | null;
}

export interface TokenPayload {
  username: string;
  role: string;
}