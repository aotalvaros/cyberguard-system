export interface TokenService {
  generateToken(payload: TokenPayload): string;
  verifyToken(token: string): TokenPayload | null;
}

export interface TokenPayload {
  id: string;
  username: string;
  role: string;
}