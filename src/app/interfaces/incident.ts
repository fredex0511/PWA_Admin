import { Place } from "./place"
import { RouteRun } from "./route-run"

export interface Incident {
  id: number
  date: string
  placeId: number
  routeRunId: number
  place?: Place | null
  routeRun?: RouteRun | null
  reports?: Report[]
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}