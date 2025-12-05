import { Place } from "./place"
import { RouteRun } from "./route-run"
import { Evidence } from "./evidence"

export interface Incident {
  id: number
  date: string
  placeId: number
  routeRunId: number
  place?: Place | null
  routeRun?: RouteRun | null
  evidences:Evidence[]
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  description: string| null
}

export interface IncidentSnake {
  id: number
  date: string
  place_id: number
  route_run_id: number
  place?: Place | null
  route_run?: RouteRun | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}