import { Component, OnInit } from '@angular/core';
import { RunroutesService } from 'src/app/services/runroutes';
import { RouteRun } from 'src/app/interfaces/route-run';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
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

  constructor(private runroutesService:RunroutesService,   private toastController: ToastController,
    private alertController: AlertController,) { }

  ngOnInit() {
    this.getHistory()
  }

  private async getHistory() {
    this.runroutesService.getRunroutes().subscribe({
      next: async (resp) => {
        this.userRunRoutes = resp.data || [];
        console.log('Contacts loaded:', this.userRunRoutes);
      },
      error: async (err) => {
        let message = 'Error al cargar contactos';
        if (err.error.msg) {
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

}
