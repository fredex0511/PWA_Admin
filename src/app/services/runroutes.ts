import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RunroutesService {
  API_URL = environment.API_URL + 'runroutes/';

  constructor(private http: HttpClient) { }

  getRunroutes(): Observable<any> {
    return this.http.get(this.API_URL);
  }

  showRunroute(id: number): Observable<any> {
    return this.http.get(this.API_URL + id);
  }

  updateRunroute(id: number, data: any): Observable<any> {
    return this.http.put(this.API_URL + id, data);
  }

  createRunroute(data: any): Observable<any> { 
    return this.http.post(this.API_URL, data);
  }

  deleteRunroute(id: number): Observable<any> {
    return this.http.delete(this.API_URL + id);
  }
}
