import { Component, OnInit } from '@angular/core';
import { RunroutesService } from 'src/app/services/runroutes';
import { RouteRun } from 'src/app/interfaces/route-run';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EvidencesService } from 'src/app/services/evidences';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-history-mobile',
  templateUrl: './history-mobile.component.html',
  styleUrls: ['./history-mobile.component.css'],
   imports: [IonicModule, FormsModule, CommonModule],
})
export class HistoryMobileComponent  implements OnInit {
  userRunRoutes :RouteRun[] =[]
  isModalOpen = false;
  selectedRoute: RouteRun | null = null;
  isIncidentModalOpen = false;
  selectedIncident: any = null;
  evidenceUrls: { [key: number]: SafeUrl } = {};
  loadingEvidences = false;

  constructor(
    private runroutesService: RunroutesService,
    private toastController: ToastController,
    private alertController: AlertController,
    private evidencesService: EvidencesService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.getHistory()
  }

  private async getHistory() {
    this.runroutesService.getRunroutes().subscribe({
      next: async (resp) => {
        console.log(resp)
        this.userRunRoutes = resp.data || [];
        console.log('Contacts loaded:', this.userRunRoutes);
      },
      error: async (err) => {
        let message = 'Error al cargar el historial';
        if (err.error?.msg) {
          message = err.error.msg;
        } else if (err.status === 504) {
          message = 'El servidor no responde. Por favor, intenta más tarde.';
        } else if (err.status === 0) {
          message = 'No se pudo conectar al servidor. Verifica tu conexión.';
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

  openRouteDetails(routeRun: RouteRun) {
    this.selectedRoute = routeRun;
    this.isModalOpen = true;
  }

  closeRouteDetails() {
    this.isModalOpen = false;
    this.selectedRoute = null;
  }

  onModalDismiss() {
    this.isModalOpen = false;
    this.selectedRoute = null;
  }

  async openIncidentDetails(incident: any) {
    this.selectedIncident = incident;
    this.isIncidentModalOpen = true;
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

  closeIncidentDetails() {
    // Liberar URLs de objetos para evitar memory leaks
    Object.values(this.evidenceUrls).forEach((url: any) => {
      if (url && url.changingThisBreaksApplicationSecurity) {
        URL.revokeObjectURL(url.changingThisBreaksApplicationSecurity);
      }
    });
    
    this.isIncidentModalOpen = false;
    this.selectedIncident = null;
    this.evidenceUrls = {};
  }

  onIncidentModalDismiss() {
    this.closeIncidentDetails();
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

}
