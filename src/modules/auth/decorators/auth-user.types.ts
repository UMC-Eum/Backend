import { AuthProvider } from '@prisma/client';

export interface AuthenticatedUser {
  userId: number;
  provider: AuthProvider;
}

export interface AuthRequest {
  user?: AuthenticatedUser;
  accessToken?: string;
}
