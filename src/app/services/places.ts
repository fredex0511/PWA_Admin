import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PlacesService {
  API_URL = environment.API_URL + 'places/';

  constructor(private http: HttpClient) { }

  getPlaces(): Observable<any> {
    return this.http.get(this.API_URL);
  }

  showPlace(id: string): Observable<any> {
    return this.http.get(this.API_URL + id);
  }

  updatePlace(id: string, data: any): Observable<any> {
    return this.http.put(this.API_URL + id, data);
  }

  createPlace(data: any): Observable<any> {
    return this.http.post(this.API_URL, data);
  }

  deletePlace(id: string): Observable<any> {
    return this.http.delete(this.API_URL + id);
  }
}
