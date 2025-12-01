import { User } from '../user';
import { Token } from '../auth/token';

export interface LoginResponse {
  user: User;
  token: Token;
}
