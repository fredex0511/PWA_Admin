import { Incident } from "./incident"

export interface Evidence {
  id: number;
  file_type: string;
  file_name?: string | null;
  file_size?: number | null;
  path: string;
  incident_id: number;
  incident?: Incident | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
