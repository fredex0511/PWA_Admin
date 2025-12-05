import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IncidentsService {
  API_URL = environment.api + 'incidents/';

  constructor(private http: HttpClient) { }

  getIncidents(): Observable<any> {
    return this.http.get(this.API_URL);
  }

  showIncident(id: string): Observable<any> {
    return this.http.get(this.API_URL + id);
  }

  updateIncident(id: number, data: any): Observable<any> {
    return this.http.put(this.API_URL + id, data);
  }

  /**
   * Crear incidente con archivos de evidencia
   * 
   * FormData esperado:
   * - date: string (ISO format) - Fecha y hora del incidente
   * - routeRunId: string - ID del recorrido activo
   * - description: string - Descripción del incidente (opcional)
   * - files: File[] - Array de archivos (fotos, videos, audio)
   *   Estructura de cada archivo en FormData:
   *   files: [File1, File2, File3...]
   * 
   * Los archivos se envían con el nombre original del archivo
   * El backend recibe los archivos en req.files
   * 
   * Ejemplo de uso:
   * const formData = new FormData();
   * formData.append('date', new Date().toISOString());
   * formData.append('routeRunId', '123');
   * formData.append('description', 'Descripción del incidente');
   * formData.append('files', fotoFile1, 'foto1.jpg');
   * formData.append('files', fotoFile2, 'foto2.jpg');
   * formData.append('files', audioFile, 'audio.webm');
   * \n   * this.incidentsService.createIncident(formData).subscribe(...)
   */
  createIncident(data: FormData): Observable<any> {
    // No establecer Content-Type header, dejar que Angular lo haga automáticamente
    // con el boundary correcto para multipart/form-data
    return this.http.post(this.API_URL, data);
  }

  deleteIncident(id: string): Observable<any> {
    return this.http.delete(this.API_URL + id);
  }
}

