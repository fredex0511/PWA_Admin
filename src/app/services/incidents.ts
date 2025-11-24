import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IncidentsService {
  API_URL = environment.API_URL + 'incidents/';

  constructor(private http: HttpClient) { }

  getIncidents(): Observable<any> {
    return this.http.get(this.API_URL);
  }

  showIncident(id: string): Observable<any> {
    return this.http.get(this.API_URL + id);
  }

  updateIncident(id: string, data: any): Observable<any> {
    return this.http.put(this.API_URL + id, data);
  }

  createIncident(data: any): Observable<any> {
    return this.http.post(this.API_URL, data);
  }

  deleteIncident(id: string): Observable<any> {
    return this.http.delete(this.API_URL + id);
  }
}
