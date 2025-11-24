import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RouteService {
  
   API_URL = environment.API_URL + 'routes/';

  constructor(private http: HttpClient) { }

  getRoutes(): Observable<any> {
    return this.http.get(this.API_URL);
  }

  showRoute(id: string): Observable<any> {
    return this.http.get(this.API_URL + id);
  }

  updateRoute(id: string, data: any): Observable<any> {
    return this.http.put(this.API_URL + id, data);
  }

  createRoute(data: any): Observable<any> {
    return this.http.post(this.API_URL, data);
  }

  deleteRoute(id: string): Observable<any> {
    return this.http.delete(this.API_URL + id);
  }
}
