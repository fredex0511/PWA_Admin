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

export interface RouteDto {
  id: number
   name:string
  user_id: number
  start_place_id: number
  end_place_id: number
  user?: User | null
  start_place?: Place | null
  end_place?: Place | null
  runs?: RouteRun[]
  created_at: string
  updated_at: string
  deleted_at?: string | null
}