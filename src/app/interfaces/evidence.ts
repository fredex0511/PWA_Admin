import { PlaceType } from "../types/place-type"
import { EvidenceType } from "../types/evidence-type"

export interface Evidence {
  id: number
  type: EvidenceType
  path: string
  report_id: number
  report?: Report | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}