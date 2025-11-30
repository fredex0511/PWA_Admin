import { addIcons } from 'ionicons';
import { addCircleOutline, logOutOutline, mapOutline, createOutline } from 'ionicons/icons';

export function registerIonicons() {
  addIcons({
    'add-circle-outline': addCircleOutline,
    'log-out-outline': logOutOutline,
    'map-outline': mapOutline,
    'create-outline': createOutline,
  });
}
