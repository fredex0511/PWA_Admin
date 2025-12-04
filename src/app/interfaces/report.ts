import { Evidence } from "./evidence"
import { Incident } from "./incident"

export interface Report {
  id: number
  name: string
  description: string
  incidentId: number
  incident?: Incident | null
  evidences?: Evidence[]
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}