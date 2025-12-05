import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ContactsService {
 API_URL = environment.api + 'contacts/';

  constructor(private http: HttpClient) { }

  getContacts(): Observable<any> {
    return this.http.get(this.API_URL);
  }

  showContact(id: string): Observable<any> {
    return this.http.get(this.API_URL + id);
  }

  updateContact(id: string, data: any): Observable<any> {
    return this.http.put(this.API_URL + id, data);
  }

  createContact(data: any): Observable<any> { 
    return this.http.post(this.API_URL, data);
  }

  deleteContact(id: string): Observable<any> {
    return this.http.delete(this.API_URL + id);
  }
}