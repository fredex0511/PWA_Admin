import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apiresponse/api-response';
import { IncidentTypes } from '../interfaces/incident-type';

@Injectable({
  providedIn: 'root'
})
export class IncidentType{
  API_URL = environment.api + 'incidenttype/';

  constructor(private http: HttpClient) { }

  getIncidentType(): Observable<ApiResponse<IncidentTypes[]>> {
    return this.http.get<ApiResponse<IncidentTypes[]>>(this.API_URL);
  }

}

