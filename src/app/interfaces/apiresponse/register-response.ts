import { User } from '../user';
import { Token } from '../auth/token';

export interface RegisterResponse {
  user: User;
  token: Token;
}
