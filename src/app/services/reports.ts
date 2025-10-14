import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
   API_URL = environment.API_URL + 'reports/';

  constructor(private http: HttpClient) { }

  getReports(): Observable<any> {
    return this.http.get(this.API_URL);
  }

  showReport(id: string): Observable<any> {
    return this.http.get(this.API_URL + id);
  }

  updateReport(id: string, data: any): Observable<any> {
    return this.http.put(this.API_URL + id, data);
  }

  createReport(data: any): Observable<any> {
    return this.http.post(this.API_URL, data);
  }

  deleteReport(id: string): Observable<any> {
    return this.http.delete(this.API_URL + id);
  }
}
