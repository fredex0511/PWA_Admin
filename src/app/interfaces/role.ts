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