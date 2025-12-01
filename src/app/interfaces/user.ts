export interface User {
  id: number;
  name: string;
  role_id: number;
  email: string;
  remember_me_token: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}