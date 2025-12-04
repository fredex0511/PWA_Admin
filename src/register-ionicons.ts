import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';

// Register all exported icons from `ionicons/icons` so templates can use
// names like `person-outline` or `lock-closed` without additional imports.
// Note: registering every icon will increase bundle size; consider
// registering only the icons you actually use in production.
export function registerIonicons() {
  const icons: Record<string, any> = {};

  for (const [exportName, svg] of Object.entries(allIcons)) {
    // Convert camelCase export names (e.g. addCircleOutline) to kebab-case
    // used by the `<ion-icon name="..."></ion-icon>` attribute
    const kebab = exportName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    icons[kebab] = svg;
  }

  addIcons(icons);
}
