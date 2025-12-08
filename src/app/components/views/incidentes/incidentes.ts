import { Component, OnInit, NgZone } from '@angular/core';
import { IonicModule, AlertController, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IncidentsService } from 'src/app/services/incidents';
import { EvidencesService } from 'src/app/services/evidences';
import { Incident } from 'src/app/interfaces/incident';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-incidentes',
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './incidentes.html',
  styleUrl: './incidentes.css'
})
export class Incidentes implements OnInit {

  constructor(
    private incidentsService: IncidentsService,
    private alertController: AlertController,
    private modalController: ModalController,
    private evidencesService: EvidencesService,
    private sanitizer: DomSanitizer,
    private ngZone: NgZone
  ) {}
  
  incidentes: Incident[] = [];
  isMapModalOpen = false;
  isEvidenceModalOpen = false;
  selectedIncident: Incident | null = null;
  mapCenter: { lat: number; lng: number } | null = null;
  evidenceUrls: { [key: number]: SafeUrl } = {};
  loadingEvidences = false;

  getTypeColor(type: string): string {
    switch (type) {
      case 'sin_riesgo':
        return 'success';
      case 'molestias':
        return 'tertiary';
      case 'peligroso':
        return 'warning';
      case 'muy_peligroso':
        return 'danger';
      default:
        return 'medium';
    }

    
  }

  getTypeLabel(type: string): string {
    switch(type) {
      case 'sin_riesgo': return 'Sin Riesgo';
      case 'molestias': return 'Molestias';
      case 'peligroso': return 'Peligroso';
      case 'muy_peligroso': return 'Muy Peligroso';
      default: return type;
    }
  }

  getStatusColor(status: string): string {
    return status === 'revisado' ? 'success' : 'warning';
  }

  getStatusLabel(status: string): string {
    return status === 'revisado' ? 'Revisado' : 'En Revisión';
  }

  ngOnInit() {
    this.getIncidentes();
  }

  private async getIncidentes() {
    this.incidentsService.getIncidents().subscribe({
      next: async (resp) => {
        this.incidentes = resp.data;
        console.log('[Incidentes]', resp);
      },
      error: async (err) => {
        let message = 'Error al cargar incidentes';
        if (err.error?.msg) {
          message = err.error.msg;
        }
        const alert = await this.alertController.create({
          header: 'Error',
          message,
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

  async updateIncident(incident: Incident) {
    const alert = await this.alertController.create({
      header: 'Actualizar Tipo de Riesgo',
      message: 'Selecciona el tipo de riesgo. El estado se marcará como "Revisado" automáticamente.',
      inputs: [
        {
          name: 'type',
          type: 'radio',
          label: 'Sin Riesgo',
          value: 'sin_riesgo',
          checked: incident.type === 'sin_riesgo'
        },
        {
          name: 'type',
          type: 'radio',
          label: 'Molestias',
          value: 'molestias',
          checked: incident.type === 'molestias'
        },
        {
          name: 'type',
          type: 'radio',
          label: 'Peligroso',
          value: 'peligroso',
          checked: incident.type === 'peligroso'
        },
        {
          name: 'type',
          type: 'radio',
          label: 'Muy Peligroso',
          value: 'muy_peligroso',
          checked: incident.type === 'muy_peligroso'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: (selectedType) => {
            // Actualizar con estado "revisado" automáticamente
            this.saveIncidentUpdate(incident.id, selectedType, 'revisado');
          }
        }
      ]
    });
    await alert.present();
  }

  private saveIncidentUpdate(id: number, type: string, status: string) {
    console.log('[Update] Enviando actualización:', { id, type, status });
    
    this.incidentsService.updateIncident(id, { type, status }).subscribe({
      next: async (resp) => {
        console.log('[Update] Respuesta del servidor:', resp);
        
        // Forzar recarga dentro de NgZone
        this.ngZone.run(() => {
          this.getIncidentes();
        });
        
        const alert = await this.alertController.create({
          header: 'Éxito',
          message: `Incidente actualizado: ${this.getTypeLabel(type)} - ${this.getStatusLabel(status)}`,
          buttons: ['OK'],
        });
        await alert.present();
      },
      error: async (err) => {
        console.error('[Update] Error:', err);
        let message = 'Error al actualizar incidente';
        if (err.error?.msg) {
          message = err.error.msg;
        } else if (err.message) {
          message = err.message;
        }
        const alert = await this.alertController.create({
          header: 'Error',
          message,
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

  viewOnMap(incident: Incident) {
    if (incident.place) {
      this.selectedIncident = incident;
      this.mapCenter = {
        lat: incident.place.lat,
        lng: incident.place.long
      };
      this.isMapModalOpen = true;
      
      // Esperar a que el modal esté visible antes de inicializar el mapa
      setTimeout(() => {
        this.initMap();
      }, 300);
    }
  }

  closeMapModal() {
    this.isMapModalOpen = false;
    this.selectedIncident = null;
    this.mapCenter = null;
  }

  onMapModalDismiss() {
    this.closeMapModal();
  }

  private initMap() {
    if (!this.mapCenter || !(window as any).google) return;

    const mapEl = document.getElementById('incidentMap');
    if (!mapEl) return;

    const google = (window as any).google;
    const map = new google.maps.Map(mapEl, {
      center: this.mapCenter,
      zoom: 16,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    // Agregar marcador
    new google.maps.Marker({
      position: this.mapCenter,
      map: map,
      title: this.selectedIncident?.description || 'Ubicación del incidente',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#ff6b35',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      }
    });
  }

  async viewEvidences(incident: Incident) {
    this.selectedIncident = incident;
    this.isEvidenceModalOpen = true;
    this.evidenceUrls = {};
    
    if (incident.evidences && incident.evidences.length > 0) {
      this.loadingEvidences = true;
      
      // Cargar todas las evidencias
      for (const evidence of incident.evidences) {
        try {
          await this.loadEvidence(evidence);
        } catch (error) {
          console.error(`Error cargando evidencia ${evidence.id}:`, error);
        }
      }
      
      this.loadingEvidences = false;
    }
  }

  private async loadEvidence(evidence: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.evidencesService.getevidence(evidence.id).subscribe({
        next: (blob: Blob) => {
          // Crear URL del blob
          const objectURL = URL.createObjectURL(blob);
          this.evidenceUrls[evidence.id] = this.sanitizer.bypassSecurityTrustUrl(objectURL);
          console.log(`[Evidence] Cargada evidencia ${evidence.id}:`, evidence.file_name);
          resolve();
        },
        error: (err) => {
          console.error(`[Evidence] Error al cargar evidencia ${evidence.id}:`, err);
          reject(err);
        }
      });
    });
  }

  closeEvidenceModal() {
    // Liberar URLs de objetos para evitar memory leaks
    Object.values(this.evidenceUrls).forEach((url: any) => {
      if (url && url.changingThisBreaksApplicationSecurity) {
        URL.revokeObjectURL(url.changingThisBreaksApplicationSecurity);
      }
    });
    
    this.isEvidenceModalOpen = false;
    this.evidenceUrls = {};
  }

  onEvidenceModalDismiss() {
    this.closeEvidenceModal();
  }

  getEvidenceUrl(evidenceId: number): SafeUrl | null {
    return this.evidenceUrls[evidenceId] || null;
  }

  isImageEvidence(evidence: any): boolean {
    return evidence.file_type?.startsWith('image/') || false;
  }

  isAudioEvidence(evidence: any): boolean {
    return evidence.file_type?.startsWith('audio/') || false;
  }

  isVideoEvidence(evidence: any): boolean {
    return evidence.file_type?.startsWith('video/') || false;
  }

  async notifyIncident(incident: Incident) {
    const alert = await this.alertController.create({
      header: 'Notificar Incidente',
      message: `¿Enviar notificación para el incidente #${incident.id}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Enviar',
          handler: () => {
            this.sendNotification(incident.id);
          }
        }
      ]
    });
    await alert.present();
  }

  private sendNotification(incidentId: number) {
    this.incidentsService.notificationIncident(incidentId).subscribe({
      next: async (resp) => {
        console.log('[Notification] Respuesta:', resp);
        const alert = await this.alertController.create({
          header: 'Éxito',
          message: 'Notificación enviada correctamente',
          buttons: ['OK'],
        });
        await alert.present();
      },
      error: async (err) => {
        console.error('[Notification] Error:', err);
        let message = 'Error al enviar la notificación';
        if (err.error?.msg) {
          message = err.error.msg;
        } else if (err.message) {
          message = err.message;
        }
        const alert = await this.alertController.create({
          header: 'Error',
          message,
          buttons: ['OK'],
        });
        await alert.present();
      }
    });
  }
}