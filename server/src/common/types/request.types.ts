import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
