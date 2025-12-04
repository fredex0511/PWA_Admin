import { Route } from "./route"
import { User } from "./user"
import { Incident } from "./incident"

export interface RouteRun {
  id: number
  routeId: number
  userId: number
  start_time: string
  end_time: string
  route?: Route | null
  user?: User | null
  incidents?: Incident[]
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}