import { User } from "./user";

export interface Contact {
  id: number;
  phone: string;
  email: string;
  name: string;
  direction: string;
  user_id: number;
  user?: User | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}


export interface ContactCreate{
  phone: string;
  email: string;
  name: string;
  direction: string;
}
