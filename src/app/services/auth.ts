import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { LoginResponse } from '../interfaces/apiresponse/login-response';
import { LoginRequest } from '../interfaces/apirequest/login-request';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  API_URL = environment.apiAUTH;

  constructor(private http: HttpClient) { }

  login(data:LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}login`, data);
  }

  logout(): Observable<any> {
    return this.http.post<any>(`${this.API_URL}logout`, {});
  }

  profile(): Observable<any>{
    return this.http.get<any>(`${this.API_URL}profile`);
  }
}