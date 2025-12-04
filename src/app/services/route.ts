import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Route } from '../interfaces/route';
import { ApiResponse } from '../interfaces/apiresponse/api-response';
@Injectable({
  providedIn: 'root'
})
export class RouteService {
  
   API_URL = environment.api + 'routes/';

  constructor(private http: HttpClient) { }

  getRoutes(): Observable<ApiResponse<Route[]>> {
    return this.http.get<ApiResponse<Route[]>>(this.API_URL);
  }

  showRoute(id: string): Observable<any> {
    return this.http.get(this.API_URL + id);
  }

  updateRoute(id: string, data: any): Observable<any> {
    return this.http.put(this.API_URL + id, data);
  }

  createRoute(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.API_URL, data);
  }

  deleteRoute(id: string): Observable<any> {
    return this.http.delete(this.API_URL + id);
  }
}
