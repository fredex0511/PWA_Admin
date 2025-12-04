import { User } from "./user"
import { Place } from "./place"
import { RouteRun } from "./route-run"
export interface Route {
  id: number
  name:string
  userId: number
  startPlaceId: number
  endPlaceId: number
  user?: User | null
  startPlace?: Place | null
  endPlace?: Place | null
  runs?: RouteRun[]
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}