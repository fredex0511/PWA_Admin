import { Place } from "./place"
import { RouteRun } from "./route-run"
import { Evidence } from "./evidence"
import { IncidentTypes } from "./incident-type"

export interface Incident {
  id: number
  date: string
  incidentType:IncidentTypes
  incident_type_id:number
  type: 'sin_riesgo' | 'molestias' | 'peligroso' | 'muy_peligroso'
  status: 'revision' | 'revisado'
  placeId: number
  routeRunId: number
  place?: Place | null
  routeRun?: RouteRun | null
  evidences: Evidence[]
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  description: string | null
}

export interface IncidentSnake {
  id: number
  date: string
  incident_type_id:number
  place_id: number
  route_run_id: number
  place?: Place | null
  route_run?: RouteRun | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}