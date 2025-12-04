import { Role } from "./role";
import { Contact } from "./contact";
import { Route } from "./route";
import { RouteRun } from "./route-run";

export interface User {
  id: number;
  name: string;
  role_id: number;
  email: string;
  remember_me_token: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  password?: string
  rememberMeToken?: string | null
  role?: Role | null
  contacts?: Contact[]
  routes?: Route[]
  routeRuns?: RouteRun []
  deletedAt?: string| null
}