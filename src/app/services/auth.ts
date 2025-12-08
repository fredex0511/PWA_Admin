import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { LoginResponse } from '../interfaces/apiresponse/login-response';
import { LoginRequest } from '../interfaces/apirequest/login-request';
import { RegisterRequest } from '../interfaces/apirequest/register-request';
import { RegisterResponse} from '../interfaces/apiresponse/register-response';
import { ApiResponse } from '../interfaces/apiresponse/api-response';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  API_URL = environment.apiAUTH;

  constructor(private http: HttpClient) { }

  login(data:LoginRequest): Observable<ApiResponse<{ email: string, requiresCode: boolean }>> {
    return this.http.post<ApiResponse<{ email: string, requiresCode: boolean }>>(`${this.API_URL}login`, data);
  }

  register(data:RegisterRequest) : Observable<ApiResponse< { email: string, requiresCode: boolean }>> {
    return this.http.post<ApiResponse<{ email: string, requiresCode: boolean }>>(`${this.API_URL}register`, data);
  }

  verifyCode(data:{email:string,code:string}) : Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_URL}verify-code`, data);
  }


  logout(): Observable<any> {
    return this.http.post<any>(`${this.API_URL}logout`, {});
  }

  profile(): Observable<any>{
    return this.http.get<any>(`${this.API_URL}profile`);
  }
}