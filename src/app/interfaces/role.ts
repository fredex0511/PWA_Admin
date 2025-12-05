import { User } from "./user"
export interface Role {
  id: number
  name: string
  description: string
  users?: User[]
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface RoleSnake {
  id: number
  name: string
  description: string
  users?: User[]
  created_at: string
  updated_at: string
  deleted_at?: string | null
}