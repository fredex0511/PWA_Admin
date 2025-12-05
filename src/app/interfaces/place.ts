import { PlaceType } from "../types/place-type"
import { Incident } from "./incident"
import { Route } from "./route"

export interface Place {
  id: number
  lat: number
  long: number
  name: string
  type: PlaceType
  incidents?: Incident[]
  startRoutes?: Route[]
  endRoutes?: Route[]
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface PlaceSnake {
  id: number
  lat: number
  long: number
  name: string
  type: PlaceType
  incidents?: Incident[]
  start_routes?: Route[]
  end_routes?: Route[]
  created_at: string
  updated_at: string
  deleted_at?: string | null
}