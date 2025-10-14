import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class UserService {
 API_URL = environment.API_URL + 'users/';

  constructor(private http: HttpClient) { }

  getUsers(): Observable<any> {
    return this.http.get(this.API_URL);
  }

  showUser(id: string): Observable<any> {
    return this.http.get(this.API_URL + id);
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
