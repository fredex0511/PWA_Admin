import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apiresponse/api-response';
import { User } from '../interfaces/user';

@Injectable({
  providedIn: 'root'
})

export class UserService {
 API_URL = environment.api + 'users/';

  constructor(private http: HttpClient) { }

  getUsers(role: string | null, includeDeleted: boolean = false): Observable<ApiResponse<User[]>> {
    const deletedParam = includeDeleted ? '&includeDeleted=true' : '';
    return this.http.get<ApiResponse<User[]>>(this.API_URL + `?role=${role}${deletedParam}`);
  }

  showUser(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(this.API_URL + id);
  }

  updateUser(id: string, data: any): Observable<any> {
    return this.http.put(this.API_URL + id, data);
  }

  createUser(data: any): Observable<any> {
    return this.http.post(this.API_URL, data);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(this.API_URL + id);
  }
}
