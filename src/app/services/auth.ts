import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  API_URL = environment.apiAUTH;

  constructor(private http: HttpClient) { }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}login`, {
        email,
        password
    });
  }

  logout(): Observable<any> {
    return this.http.post<any>(`${this.API_URL}logout`, {});
  }

  profile(): Observable<any>{
    return this.http.get<any>(`${this.API_URL}profile`);
  }
}