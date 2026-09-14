import { Routes } from '@angular/router';
import { HubComponent } from './pages/hub/hub.component';

export const routes: Routes = [
  { path: '', component: HubComponent },
  { path: '**', redirectTo: '' },
];
