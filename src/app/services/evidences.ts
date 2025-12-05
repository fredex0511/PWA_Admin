import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EvidencesService {
  API_URL = environment.api + 'evidences/';

  constructor(private http: HttpClient) { }

  getEvidences(): Observable<any> {
    return this.http.get(this.API_URL);
  }

  showEvidence(id: number): Observable<any> {
    return this.http.get(this.API_URL + id);
  }

  updateEvidence(id: number, data: any): Observable<any> {
    return this.http.put(this.API_URL + id, data);
  }

  createEvidence(data: any): Observable<any> { 
    return this.http.post(this.API_URL, data);
  }

  deleteEvidence(id: number): Observable<any> {
    return this.http.delete(this.API_URL + id);
  }
  
  getevidence(id: number): Observable<Blob> {
    return this.http.get(this.API_URL + id + '/file', { 
      responseType: 'blob' 
    });
  }
}
